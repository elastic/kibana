/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import {
  DEFAULT_SEMANTIC_SEARCH_INFERENCE_ID,
  SEMANTIC_FIELD_SUFFIX,
  MAX_SEMANTIC_SEARCH_FIELDS,
  getSemanticFieldName,
  resolveSemanticInferenceId,
} from './semantic_search';

const createType = (overrides: Partial<SavedObjectsType> = {}): SavedObjectsType => ({
  name: 'test',
  hidden: false,
  namespaceType: 'single',
  mappings: { properties: {} },
  ...overrides,
});

describe('semantic_search constants', () => {
  it('DEFAULT_SEMANTIC_SEARCH_INFERENCE_ID is the ELSER endpoint', () => {
    expect(DEFAULT_SEMANTIC_SEARCH_INFERENCE_ID).toBe('.elser-2-elasticsearch');
  });

  it('SEMANTIC_FIELD_SUFFIX is _semantic', () => {
    expect(SEMANTIC_FIELD_SUFFIX).toBe('_semantic');
  });

  it('MAX_SEMANTIC_SEARCH_FIELDS is 8', () => {
    expect(MAX_SEMANTIC_SEARCH_FIELDS).toBe(8);
  });
});

describe('getSemanticFieldName', () => {
  it('appends the suffix to the field name', () => {
    expect(getSemanticFieldName('title')).toBe('title_semantic');
    expect(getSemanticFieldName('description')).toBe('description_semantic');
  });
});

describe('resolveSemanticInferenceId', () => {
  it('returns the default inference ID when no inferenceId is declared', () => {
    const type = createType({ semanticSearch: { fields: ['title'] } });
    expect(resolveSemanticInferenceId(type)).toBe(DEFAULT_SEMANTIC_SEARCH_INFERENCE_ID);
  });

  it('returns the override inferenceId when declared', () => {
    const type = createType({
      semanticSearch: { fields: ['title'], inferenceId: '.my-custom-endpoint' },
    });
    expect(resolveSemanticInferenceId(type)).toBe('.my-custom-endpoint');
  });

  it('returns the default when semanticSearch has no inferenceId property', () => {
    const type = createType({ semanticSearch: { fields: ['title'], inferenceId: undefined } });
    expect(resolveSemanticInferenceId(type)).toBe(DEFAULT_SEMANTIC_SEARCH_INFERENCE_ID);
  });
});
