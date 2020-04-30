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

export interface Descriptor {
  [name: string]: Descriptor | { kind: number };
}

export function isObjectDescriptor(value: any) {
  if (typeof value === 'object') {
    if (typeof value.type === 'string' && value.type === 'object') {
      return true;
    }

    if (typeof value.type === 'undefined') {
      return true;
    }
  }

  return false;
}

export function kindToDescriptorName(kind: number) {
  switch (kind) {
    case ts.SyntaxKind.StringKeyword:
      return 'string';
    case ts.SyntaxKind.BooleanKeyword:
      return 'boolean';
    case ts.SyntaxKind.NumberKeyword:
      return 'number';
    default:
      throw new Error(`Unknown kind ${kind}`);
  }
}

export function getDescriptor(node: ts.Node, typeChecker: ts.TypeChecker): any {
  if (ts.isMethodSignature(node) || ts.isPropertySignature(node)) {
    if (node.type) {
      return getDescriptor(node.type, typeChecker);
    }
  }
  if (ts.isTypeLiteralNode(node) || ts.isInterfaceDeclaration(node)) {
    return node.members.reduce((acc, m) => {
      acc[m.name?.getText() || ''] = getDescriptor(m, typeChecker);
      return acc;
    }, {} as any);
  }

  if (ts.isTypeReferenceNode(node)) {
    const symbol = typeChecker.getSymbolAtLocation(node.typeName);
    const declaration = ((symbol && symbol.declarations) || [])[0];
    return getDescriptor(declaration, typeChecker);
  }

  switch (node.kind) {
    case ts.SyntaxKind.NumberKeyword:
    case ts.SyntaxKind.BooleanKeyword:
    case ts.SyntaxKind.StringKeyword:
      return { kind: node.kind };
    case ts.SyntaxKind.ArrayType:
    case ts.SyntaxKind.AnyKeyword:
    default:
      throw new Error(`Unknown type ${ts.SyntaxKind[node.kind]}`);
  }
}
