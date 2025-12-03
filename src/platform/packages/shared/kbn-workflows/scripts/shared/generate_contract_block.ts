/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractMeta } from './types';

export function generateContractBlock(contract: ContractMeta): string {
  return `
    export const ${contract.contractName}: InternalConnectorContract = {
      type: '${contract.type}',
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
      paramsSchema: ${contract.paramsSchemaString},
      outputSchema: ${contract.outputSchemaString},
    }`.trim();
}

export function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/`/g, '\\`') // Escape backticks
    .replace(/\$/g, '\\$'); // Escape dollar signs (template literals)
}
