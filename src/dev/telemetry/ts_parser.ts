/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as ts from 'typescript';
import { createFailError, isFailError } from '@kbn/dev-utils';
import * as crypto from 'crypto';
import * as path from 'path';
import { getProperty, getPropertyValue } from './utils';
import { getDescriptor, Descriptor } from './serializer';

export function* traverseNodes(maybeNodes: ts.Node | ts.Node[]): Generator<ts.Node> {
  const nodes: ts.Node[] = Array.isArray(maybeNodes) ? maybeNodes : [maybeNodes];

  for (const node of nodes) {
    const children: ts.Node[] = [];
    yield node;
    ts.forEachChild(node, child => {
      children.push(child);
    });
    for (const child of children) {
      yield* traverseNodes(child);
    }
  }
}

export function isMakeUsageCollectorFunction(
  node: ts.Node,
  sourceFile: ts.SourceFile
): node is ts.CallExpression {
  if (ts.isCallExpression(node)) {
    const isMakeUsageCollector = node.expression.getText(sourceFile) === 'makeUsageCollector';
    if (isMakeUsageCollector) {
      return true;
    }
  }
  return false;
}

export interface CollectorDetails {
  collectorName: string;
  fetch: { typeName: string; typeDescriptor: Descriptor; signature: string };
  mapping: { value: any };
}

function extractCollectorDetails(
  collectorNode: ts.CallExpression,
  typeChecker: ts.TypeChecker
): CollectorDetails {
  if (collectorNode.arguments.length > 1) {
    throw createFailError(`makeUsageCollector does not accept more than one argument.`);
  }

  const collectorConfig = collectorNode.arguments[0];
  if (!ts.isObjectLiteralExpression(collectorConfig)) {
    throw createFailError(`makeUsageCollector does not accept more than one argument.`);
  }
  const typeProperty = getProperty(collectorConfig, 'type');
  if (!typeProperty) {
    throw createFailError(`usageCollector.type must be defined.`);
  }
  const typePropertyValue = getPropertyValue(typeProperty);
  if (!typePropertyValue || typeof typePropertyValue !== 'string') {
    throw createFailError(`usageCollector.type must be be a non-empty string literal.`);
  }

  const fetchProperty = getProperty(collectorConfig, 'fetch');
  if (!fetchProperty) {
    throw createFailError(`usageCollector.fetch must be defined.`);
  }
  const mappingProperty = getProperty(collectorConfig, 'mapping');
  if (!mappingProperty) {
    throw createFailError(`usageCollector.mapping must be defined.`);
  }

  const mappingPropertyValue = getPropertyValue(mappingProperty);
  if (!mappingPropertyValue || typeof mappingPropertyValue !== 'object') {
    throw createFailError(`usageCollector.mapping must be be an object.`);
  }

  const collectorNodeType = collectorNode.typeArguments;
  if (!collectorNodeType || collectorNodeType?.length === 0) {
    throw createFailError(
      `makeUsageCollector requires a Usage type makeUsageCollector<Usage>({ ... }).`
    );
  }

  const usageTypeNode = collectorNodeType[0];
  const usageTypeName = usageTypeNode.getText();
  const usageType: Descriptor = getDescriptor(usageTypeNode, typeChecker);
  const snapshot = fetchProperty.getFullText();
  const fnHash = crypto
    .createHash('md5')
    .update(snapshot)
    .digest('hex');

  return {
    collectorName: typePropertyValue,
    mapping: {
      value: mappingPropertyValue,
    },
    fetch: {
      typeName: usageTypeName,
      typeDescriptor: usageType,
      signature: fnHash,
    },
  };
}

export type ParsedUsageCollection = [string, CollectorDetails];
export function* parseUsageCollection(
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker
): Generator<ParsedUsageCollection> {
  const relativePath = path.relative(process.cwd(), sourceFile.fileName);
  for (const node of traverseNodes(sourceFile)) {
    if (isMakeUsageCollectorFunction(node, sourceFile)) {
      yield [relativePath, extractCollectorDetails(node, typeChecker)];
    }
  }
}
