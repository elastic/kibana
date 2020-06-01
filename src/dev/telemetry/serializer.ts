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
import { uniq } from 'lodash';

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

export enum TelemetryKinds {
  MomentDate = 1000,
}

export function kindToDescriptorName(kind: number) {
  switch (kind) {
    case ts.SyntaxKind.StringKeyword:
    case ts.SyntaxKind.StringLiteral:
      return 'string';
    case ts.SyntaxKind.BooleanKeyword:
      return 'boolean';
    case ts.SyntaxKind.NumberKeyword:
    case ts.SyntaxKind.NumericLiteral:
      return 'number';
    case TelemetryKinds.MomentDate:
      return 'date';
    default:
      throw new Error(`Unknown kind ${kind}`);
  }
}

export function getDescriptor(node: ts.Node, program: ts.Program): any {
  if (ts.isMethodSignature(node) || ts.isPropertySignature(node)) {
    if (node.type) {
      return getDescriptor(node.type, program);
    }
  }
  if (ts.isTypeLiteralNode(node) || ts.isInterfaceDeclaration(node)) {
    return node.members.reduce((acc, m) => {
      acc[m.name?.getText() || ''] = getDescriptor(m, program);
      return acc;
    }, {} as any);
  }

  if (ts.SyntaxKind.FirstNode === node.kind) {
    return getDescriptor((node as any).right, program);
  }

  if (ts.isIdentifier(node)) {
    const identifierName = node.getText();
    if (identifierName === 'Moment') {
      return { kind: TelemetryKinds.MomentDate };
    }
    throw new Error(`Unsupported Identifier ${identifierName}.`);
  }

  if (ts.isTypeReferenceNode(node)) {
    const typeChecker = program.getTypeChecker();
    const symbol = typeChecker.getSymbolAtLocation(node.typeName);
    const symbolName = symbol?.getName();
    if (symbolName === 'Moment') {
      return { kind: TelemetryKinds.MomentDate };
    }
    const declaration = (symbol?.getDeclarations() || [])[0];
    if (declaration) {
      return getDescriptor(declaration, program);
    }
    return getDescriptor(node.typeName, program);
  }

  if (ts.isImportSpecifier(node)) {
    const importedNodeName = node.getText();
    const importedModuleName = node.parent.parent.parent.moduleSpecifier.text;
    const resolvedModule = (node.getSourceFile() as any).resolvedModules.get(importedModuleName);
    const resolvedModuleSourceFile = program.getSourceFile(resolvedModule.resolvedFileName);
    if (resolvedModuleSourceFile) {
      const sourceNode = (resolvedModuleSourceFile as any).locals.get(importedNodeName);
      const declaration = ((sourceNode && sourceNode.declarations) || [])[0];
      return getDescriptor(declaration, program);
    }
    throw new Error(`Unable to resolve imported module ${importedModuleName}`);
  }

  if (ts.isArrayTypeNode(node)) {
    return { kind: node.elementType.kind };
  }

  if (ts.isLiteralTypeNode(node)) {
    return { kind: node.literal.kind };
  }

  if (ts.isUnionTypeNode(node)) {
    const types = node.types.filter((typeNode) => {
      return (
        typeNode.kind !== ts.SyntaxKind.NullKeyword &&
        typeNode.kind !== ts.SyntaxKind.UndefinedKeyword
      );
    });

    const kinds = types.map((typeNode) => getDescriptor(typeNode, program));

    const uniqueKinds = uniq(kinds, 'kind');

    if (uniqueKinds.length !== 1) {
      throw Error('Mapping does not support conflicting union types.');
    }

    return uniqueKinds[0];
  }

  switch (node.kind) {
    case ts.SyntaxKind.NumberKeyword:
    case ts.SyntaxKind.BooleanKeyword:
    case ts.SyntaxKind.StringKeyword:
      return { kind: node.kind };
    case ts.SyntaxKind.UnionType:
    case ts.SyntaxKind.AnyKeyword:
    default:
      throw new Error(`Unknown type ${ts.SyntaxKind[node.kind]}`);
  }
}
