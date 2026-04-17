/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeString, generateContractBlock } from './generate_contract_block';
import type { ContractMeta } from './types';

const baseContract: ContractMeta = {
  fileName: 'search',
  contractName: 'searchContract',
  type: 'elasticsearch.search',
  summary: 'Search API',
  description: 'Runs a search query',
  methods: ['GET', 'POST'],
  patterns: ['/_search', '/{index}/_search'],
  documentation: 'https://elastic.co/docs/search',
  stability: 'beta',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['q'],
    bodyParams: ['query'],
  },
  paramsSchemaString: 'search_request',
  outputSchemaString: 'search_response',
  operations: [{ id: 'search', path: '/_search', method: 'GET' }],
  schemaImports: ['search_request', 'search_response'],
};

describe('escapeString', () => {
  it('should escape backslashes, backticks, and dollar signs', () => {
    expect(escapeString('a\\b`c$d')).toBe('a\\\\b\\`c\\$d');
  });

  it('should return strings without special chars unchanged', () => {
    expect(escapeString('plain text')).toBe('plain text');
  });
});

describe('generateContractBlock', () => {
  it('should include all fields when optional fields are present', () => {
    const result = generateContractBlock(baseContract);
    expect(result).toContain("stability: 'beta'");
    expect(result).toContain('`Search API`');
    expect(result).toContain('`Runs a search query`');
    expect(result).toContain("'https://elastic.co/docs/search'");
    expect(result).toContain('export const searchContract');
  });

  it('should handle absent optional fields', () => {
    const contract: ContractMeta = {
      ...baseContract,
      stability: undefined,
      summary: null,
      description: null,
      documentation: null,
    };
    const result = generateContractBlock(contract);
    expect(result).not.toContain('stability:');
    expect(result).toContain('summary: null');
    expect(result).toContain('description: null');
    expect(result).toContain('documentation: null');
  });

  it('should JSON-stringify methods, patterns, and parameterTypes', () => {
    const result = generateContractBlock(baseContract);
    expect(result).toContain('["GET","POST"]');
    expect(result).toContain('["/_search","/{index}/_search"]');
    expect(result).toContain('["index"]');
    expect(result).toContain('["q"]');
    expect(result).toContain('["query"]');
  });
});
