/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractMeta } from './types';

// Utils used in the generated code, should be imported relative to @kbn/workflows/common/generated/
export const StaticImports = `
import { getShapeAt, getZodLooseObjectFromProperty, getZodObjectFromProperty } from '../utils/zod';
`;

export function generateContractBlock(contract: ContractMeta): string {
  return `
  const ${contract.contractName}: InternalConnectorContract = {
    type: '${contract.type}',
    connectorGroup: 'internal',
    summary: ${contract.summary ? `\`${escapeString(contract.summary)}\`` : 'null'},
    description: ${contract.description ? `\`${escapeString(contract.description)}\`` : 'null'},
    methods: ${JSON.stringify(contract.methods ?? [])},
    patterns: ${JSON.stringify(contract.patterns ?? [])},
    documentation: ${contract.documentation ? `'${contract.documentation}'` : 'null'},
    parameterTypes: {
      headerParams: ${JSON.stringify(contract.parameterTypes.headerParams ?? [])},
      pathParams: ${JSON.stringify(contract.parameterTypes.pathParams ?? [])},
      urlParams: ${JSON.stringify(contract.parameterTypes.urlParams ?? [])},
      bodyParams: ${JSON.stringify(contract.parameterTypes.bodyParams ?? [])},
    },
    paramsSchema: ${generateParamsSchemaString(contract.operationIds)},
    outputSchema: ${generateOutputSchemaString(contract.operationIds)},
  }`.trim();
}

// TODO: unwrap and combine the shapes at the build time instead of at the runtime
// Union is important because if we use object we override parameters from "body", "path", "query" with the same name with the latest one
export function generateParamsSchemaString(operationIds: string[]): string {
  return generateParamsSchemaSpreadUnion(operationIds);
}

function generateParamsSchemaSpreadUnion(operationIds: string[]): string {
  if (operationIds.length === 0) {
    return 'z.optional(z.object({}))';
  }

  if (operationIds.length === 1) {
    return `z.object({
      ...getShapeAt(${getRequestSchemaName(operationIds[0])}, 'body'),
      ...getShapeAt(${getRequestSchemaName(operationIds[0])}, 'path'),
      ...getShapeAt(${getRequestSchemaName(operationIds[0])}, 'query'),
    })`;
  }

  return `z.union([${operationIds
    .map(
      (operationId) => `z.object({
      ...getShapeAt(${getRequestSchemaName(operationId)}, 'body'),
      ...getShapeAt(${getRequestSchemaName(operationId)}, 'path'),
      ...getShapeAt(${getRequestSchemaName(operationId)}, 'query'),
    })`
    )
    .join(', ')}])`;
}

function generateParamsSchemaStringUnion(operationIds: string[]): string {
  if (operationIds.length === 0) {
    return 'z.optional(z.looseObject({}))';
  }
  return `z.union([${operationIds
    .map(
      (operationId) =>
        `getZodLooseObjectFromProperty(${getRequestSchemaName(operationId)}, 'body'),
          getZodLooseObjectFromProperty(${getRequestSchemaName(operationId)}, 'path'),
          getZodLooseObjectFromProperty(${getRequestSchemaName(operationId)}, 'query'),`
    )
    .join('\n')}])`;
}

export function generateOutputSchemaString(operationIds: string[]): string {
  // TODO: add error schema
  return generateSuccessSchemaString(operationIds);
}

function generateSuccessSchemaString(operationIds: string[]): string {
  if (operationIds.length === 0) {
    return 'z.optional(z.looseObject({}))';
  }
  if (operationIds.length === 1) {
    return `${getResponseSchemaName(operationIds[0])}`;
  }
  return `z.union([${operationIds
    .map((operationId) => `${getResponseSchemaName(operationId)}`)
    .join(', ')}])`;
}

export function getRequestSchemaName(operationId: string): string {
  return `${getSchemaNamePrefix(operationId)}_request`;
}

export function getResponseSchemaName(operationId: string): string {
  return `${getSchemaNamePrefix(operationId)}_response`;
}

// copied from packages/openapi-ts/src/openApi/common/parser/sanitize.ts, which is licensed under the MIT license
/**
 * Sanitizes namespace identifiers so they are valid TypeScript identifiers of a certain form.
 *
 * 1: Remove any leading characters that are illegal as starting character of a typescript identifier.
 * 2: Replace illegal characters in remaining part of type name with hyphen (-).
 *
 * Step 1 should perhaps instead also replace illegal characters with underscore, or prefix with it, like sanitizeEnumName
 * does. The way this is now one could perhaps end up removing all characters, if all are illegal start characters. It
 * would be sort of a breaking change to do so, though, previously generated code might change then.
 *
 * JavaScript identifier regexp pattern retrieved from https://developer.mozilla.org/docs/Web/JavaScript/Reference/Lexical_grammar#identifiers
 *
 * The output of this is expected to be converted to PascalCase
 */
export const sanitizeNamespaceIdentifier = (name: string) =>
  name
    .replace(/^[^\p{ID_Start}]+/u, '')
    .replace(/[^$\u200c\u200d\p{ID_Continue}]/gu, '-')
    .replace(/[$+]/g, '-');

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, ''); // remove leading underscore
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/-(\d+)/g, '$1') // Remove hyphen before numbers
    .replace(/-/g, '_') // Replace remaining hyphens with underscores
    .replace(/\./g, '_'); // Replace dots with underscores
}

export function getSchemaNamePrefix(operationId: string): string {
  return toSnakeCase(camelToSnake(sanitizeNamespaceIdentifier(operationId)));
}

export function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/`/g, '\\`') // Escape backticks
    .replace(/\$/g, '\\$'); // Escape dollar signs (template literals)
}
