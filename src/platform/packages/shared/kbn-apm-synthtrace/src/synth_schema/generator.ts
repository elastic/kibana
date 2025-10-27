/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from 'ts-morph';
import { Project, IndentationText } from 'ts-morph';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

const MAX_DEPTH = 5;

function getJsonSchemaForType(type: Type, visited: Set<Type> = new Set(), depth = 0): any {
  if (depth > MAX_DEPTH) {
    return { type: 'object', description: 'Max depth reached' };
  }

  if (visited.has(type)) {
    return { type: 'object', description: 'Circular reference' };
  }

  visited.add(type);

  try {
    if (type.isString()) {
      return { type: 'string', description: type.getText() };
    }
    if (type.isNumber()) {
      return { type: 'number', description: type.getText() };
    }
    if (type.isBoolean()) {
      return { type: 'boolean', description: type.getText() };
    }
    if (type.isObject()) {
      const properties: { [key: string]: any } = {};
      for (const prop of type.getProperties()) {
        const propName = prop.getName();
        const propValueDec = prop.getValueDeclaration();
        if (propValueDec) {
          properties[propName] = getJsonSchemaForType(propValueDec.getType(), visited, depth + 1);
        }
      }

      const callSignatures = type.getCallSignatures();
      if (callSignatures.length > 0) {
        const [signature] = callSignatures;
        const parameters = signature.getParameters();
        const paramSchema: { [key: string]: any } = {};
        for (const param of parameters) {
          const paramName = param.getName();
          const paramType = param.getValueDeclarationOrThrow().getType();
          paramSchema[paramName] = getJsonSchemaForType(paramType, visited, depth + 1);
        }
        return {
          type: 'object',
          properties: paramSchema,
          returnType: getJsonSchemaForType(signature.getReturnType(), visited, depth + 1),
        };
      }

      return { type: 'object', properties };
    }
    return { type: 'any', description: type.getText() };
  } finally {
    visited.delete(type);
  }
}

export function generateSchema() {
  const project = new Project({
    indentationText: IndentationText.TwoSpaces,
  });

  const synthtraceClientPath = path.resolve(
    REPO_ROOT,
    'src/platform/packages/shared/kbn-apm-synthtrace-client/index.ts'
  );

  const sourceFile = project.addSourceFileAtPath(synthtraceClientPath);

  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Synthtrace Schema',
    type: 'object',
    properties: {},
  };

  const rootProperties: { [key: string]: any } = {};

  for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
    if (declarations.length > 0) {
      const declaration = declarations[0];
      rootProperties[name] = getJsonSchemaForType(declaration.getType());
    }
  }

  // @ts-ignore
  schema.properties = rootProperties;

  return schema;
}
