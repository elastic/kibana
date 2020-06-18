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
import { createFailError } from '@kbn/dev-utils';
import * as path from 'path';
import { getProperty, getPropertyValue } from './utils';
import { getDescriptor, Descriptor } from './serializer';

export function* traverseNodes(maybeNodes: ts.Node | ts.Node[]): Generator<ts.Node> {
  const nodes: ts.Node[] = Array.isArray(maybeNodes) ? maybeNodes : [maybeNodes];

  for (const node of nodes) {
    const children: ts.Node[] = [];
    yield node;
    ts.forEachChild(node, (child) => {
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
    const isMakeUsageCollector = /makeUsageCollector$/.test(node.expression.getText(sourceFile));
    if (isMakeUsageCollector) {
      return true;
    }
  }

  return false;
}

export interface CollectorDetails {
  collectorName: string;
  fetch: { typeName: string; typeDescriptor: Descriptor };
  schema: { value: any };
}

function getCollectionConfigNode(
  collectorNode: ts.CallExpression,
  sourceFile: ts.SourceFile
): ts.Expression {
  if (collectorNode.arguments.length > 1) {
    throw Error(`makeUsageCollector does not accept more than one argument.`);
  }
  const collectorConfig = collectorNode.arguments[0];

  if (ts.isObjectLiteralExpression(collectorConfig)) {
    return collectorConfig;
  }

  const variableDefintionName = collectorConfig.getText();
  for (const node of traverseNodes(sourceFile)) {
    if (ts.isVariableDeclaration(node)) {
      const declarationName = node.name.getText();
      if (declarationName === variableDefintionName) {
        if (!node.initializer) {
          throw Error(`Unable to parse collector configs.`);
        }
        if (ts.isObjectLiteralExpression(node.initializer)) {
          return node.initializer;
        }
        if (ts.isCallExpression(node.initializer)) {
          const functionName = node.initializer.expression.getText(sourceFile);
          for (const sfNode of traverseNodes(sourceFile)) {
            if (ts.isFunctionDeclaration(sfNode)) {
              const fnDeclarationName = sfNode.name?.getText();
              if (fnDeclarationName === functionName) {
                const returnStatements: ts.ReturnStatement[] = [];
                for (const fnNode of traverseNodes(sfNode)) {
                  if (ts.isReturnStatement(fnNode) && fnNode.parent === sfNode.body) {
                    returnStatements.push(fnNode);
                  }
                }

                if (returnStatements.length > 1) {
                  throw Error(`Collector function cannot have multiple return statements.`);
                }
                if (returnStatements.length === 0) {
                  throw Error(`Collector function must have a return statement.`);
                }
                if (!returnStatements[0].expression) {
                  throw Error(`Collector function return statement must be an expression.`);
                }

                return returnStatements[0].expression;
              }
            }
          }
        }
      }
    }
  }

  throw Error(`makeUsageCollector argument must be an object.`);
}

function extractCollectorDetails(
  collectorNode: ts.CallExpression,
  program: ts.Program,
  sourceFile: ts.SourceFile
): CollectorDetails {
  if (collectorNode.arguments.length > 1) {
    throw Error(`makeUsageCollector does not accept more than one argument.`);
  }

  const collectorConfig = getCollectionConfigNode(collectorNode, sourceFile);

  const typeProperty = getProperty(collectorConfig, 'type');
  if (!typeProperty) {
    throw Error(`usageCollector.type must be defined.`);
  }
  const typePropertyValue = getPropertyValue(typeProperty, program);
  if (!typePropertyValue || typeof typePropertyValue !== 'string') {
    throw Error(`usageCollector.type must be be a non-empty string literal.`);
  }

  const fetchProperty = getProperty(collectorConfig, 'fetch');
  if (!fetchProperty) {
    throw Error(`usageCollector.fetch must be defined.`);
  }
  const schemaProperty = getProperty(collectorConfig, 'schema');
  if (!schemaProperty) {
    throw Error(`usageCollector.schema must be defined.`);
  }

  const schemaPropertyValue = getPropertyValue(schemaProperty, program, { chaseImport: true });
  if (!schemaPropertyValue || typeof schemaPropertyValue !== 'object') {
    throw Error(`usageCollector.schema must be be an object.`);
  }

  const collectorNodeType = collectorNode.typeArguments;
  if (!collectorNodeType || collectorNodeType?.length === 0) {
    throw Error(`makeUsageCollector requires a Usage type makeUsageCollector<Usage>({ ... }).`);
  }

  const usageTypeNode = collectorNodeType[0];
  const usageTypeName = usageTypeNode.getText();
  const usageType = getDescriptor(usageTypeNode, program) as Descriptor;

  return {
    collectorName: typePropertyValue,
    schema: {
      value: schemaPropertyValue,
    },
    fetch: {
      typeName: usageTypeName,
      typeDescriptor: usageType,
    },
  };
}

export function sourceHasUsageCollector(sourceFile: ts.SourceFile) {
  if (sourceFile.isDeclarationFile === true || (sourceFile as any).identifierCount === 0) {
    return false;
  }

  const identifiers = (sourceFile as any).identifiers;
  if (
    (!identifiers.get('makeUsageCollector') && !identifiers.get('type')) ||
    !identifiers.get('fetch')
  ) {
    return false;
  }

  return true;
}

export type ParsedUsageCollection = [string, CollectorDetails];

export function* parseUsageCollection(
  sourceFile: ts.SourceFile,
  program: ts.Program
): Generator<ParsedUsageCollection> {
  const relativePath = path.relative(process.cwd(), sourceFile.fileName);
  if (sourceHasUsageCollector(sourceFile)) {
    for (const node of traverseNodes(sourceFile)) {
      if (isMakeUsageCollectorFunction(node, sourceFile)) {
        try {
          const collectorDetails = extractCollectorDetails(node, program, sourceFile);
          yield [relativePath, collectorDetails];
        } catch (err) {
          throw createFailError(`Error extracting collector in ${relativePath}\n${err}`);
        }
      }
    }
  }
}
