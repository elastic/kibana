/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  detectAdditionalPropertiesTightening,
  REQUEST_ADDITIONAL_PROPERTIES_TIGHTENED_ID,
} from '.';
import type { RequestBodyIndex } from '../build_request_body_index';

const TIGHTENING_TEXT =
  'Request body schema disallows extra fields (additionalProperties: false). Clients sending unknown keys will now receive 400.';

const inlineDiff = (schemaDiff: unknown, mediaType = 'application/json') => ({
  paths: {
    modified: {
      '/api/test': {
        operations: {
          modified: {
            POST: {
              requestBody: {
                content: {
                  modified: {
                    [mediaType]: { schema: schemaDiff },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

const componentDiff = (componentName: string, schemaDiff: unknown) => ({
  components: {
    schemas: {
      modified: {
        [componentName]: schemaDiff,
      },
    },
  },
});

describe('detectAdditionalPropertiesTightening', () => {
  it('returns no entries and no warnings for an empty diff', () => {
    expect(detectAdditionalPropertiesTightening({}, new Map())).toEqual({
      entries: [],
      warnings: [],
    });
  });

  it('returns no entries when input is not an object', () => {
    expect(detectAdditionalPropertiesTightening(null, new Map())).toEqual({
      entries: [],
      warnings: [],
    });
    expect(detectAdditionalPropertiesTightening(undefined, new Map())).toEqual({
      entries: [],
      warnings: [],
    });
    expect(detectAdditionalPropertiesTightening('not-a-diff', new Map())).toEqual({
      entries: [],
      warnings: [],
    });
  });

  it('emits one entry for an inline body tightening at the schema root', () => {
    const diff = inlineDiff({
      additionalPropertiesAllowed: { from: null, to: false },
    });
    const result = detectAdditionalPropertiesTightening(diff, new Map());
    expect(result.entries).toEqual([
      {
        id: REQUEST_ADDITIONAL_PROPERTIES_TIGHTENED_ID,
        level: 3,
        text: TIGHTENING_TEXT,
        operation: 'POST',
        path: '/api/test',
        source: '/requestBody/content/application/json/schema',
      },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('emits one entry per consumer when a component schema tightens at the root', () => {
    const diff = componentDiff('Body', {
      additionalPropertiesAllowed: { from: null, to: false },
    });
    const index: RequestBodyIndex = new Map([
      [
        'Body',
        [
          { path: '/api/a', method: 'POST' },
          { path: '/api/b', method: 'PUT' },
        ],
      ],
    ]);
    const result = detectAdditionalPropertiesTightening(diff, index);
    expect(result.entries).toEqual([
      {
        id: REQUEST_ADDITIONAL_PROPERTIES_TIGHTENED_ID,
        level: 3,
        text: TIGHTENING_TEXT,
        operation: 'POST',
        path: '/api/a',
        source: '/components/schemas/Body',
      },
      {
        id: REQUEST_ADDITIONAL_PROPERTIES_TIGHTENED_ID,
        level: 3,
        text: TIGHTENING_TEXT,
        operation: 'PUT',
        path: '/api/b',
        source: '/components/schemas/Body',
      },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('emits no entries for a loosening transition (from:false → to:true|null)', () => {
    const diff = inlineDiff({
      additionalPropertiesAllowed: { from: false, to: true },
    });
    expect(detectAdditionalPropertiesTightening(diff, new Map()).entries).toEqual([]);

    const diffNull = inlineDiff({
      additionalPropertiesAllowed: { from: false, to: null },
    });
    expect(detectAdditionalPropertiesTightening(diffNull, new Map()).entries).toEqual([]);
  });

  it('emits no entries for a typed-schema additionalProperties addition', () => {
    const diff = inlineDiff({
      additionalProperties: { schemaAdded: true, type: 'string' },
    });
    expect(detectAdditionalPropertiesTightening(diff, new Map()).entries).toEqual([]);
  });

  it('returns a warning and drops the entry when a component tightening has zero request-body consumers', () => {
    const diff = componentDiff('ResponseOnly', {
      additionalPropertiesAllowed: { from: null, to: false },
    });
    const result = detectAdditionalPropertiesTightening(diff, new Map());
    expect(result.entries).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('ResponseOnly');
    expect(result.warnings[0]).toContain('zero request-body consumers');
  });

  it('emits a deeper source pointer for nested-property tightenings (inline)', () => {
    const diff = inlineDiff({
      properties: {
        modified: {
          nested: {
            additionalPropertiesAllowed: { from: null, to: false },
          },
        },
      },
    });
    const result = detectAdditionalPropertiesTightening(diff, new Map());
    expect(result.entries).toEqual([
      {
        id: REQUEST_ADDITIONAL_PROPERTIES_TIGHTENED_ID,
        level: 3,
        text: TIGHTENING_TEXT,
        operation: 'POST',
        path: '/api/test',
        source: '/requestBody/content/application/json/schema/properties/nested',
      },
    ]);
  });

  it('emits a deeper source pointer for nested-property tightenings (component)', () => {
    const diff = componentDiff('Body', {
      properties: {
        modified: {
          nested: {
            additionalPropertiesAllowed: { from: null, to: false },
          },
        },
      },
    });
    const index: RequestBodyIndex = new Map([['Body', [{ path: '/api/test', method: 'POST' }]]]);
    const result = detectAdditionalPropertiesTightening(diff, index);
    expect(result.entries).toEqual([
      {
        id: REQUEST_ADDITIONAL_PROPERTIES_TIGHTENED_ID,
        level: 3,
        text: TIGHTENING_TEXT,
        operation: 'POST',
        path: '/api/test',
        source: '/components/schemas/Body/properties/nested',
      },
    ]);
  });

  it('skips path-side reflections of a component tightening to avoid duplicate entries', () => {
    const diff = {
      paths: {
        modified: {
          '/api/test': {
            operations: {
              modified: {
                POST: {
                  requestBody: {
                    content: {
                      modified: {
                        'application/json': {
                          schema: { additionalPropertiesAllowed: { from: null, to: false } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          modified: {
            Body: { additionalPropertiesAllowed: { from: null, to: false } },
          },
        },
      },
    };
    const index: RequestBodyIndex = new Map([['Body', [{ path: '/api/test', method: 'POST' }]]]);
    const result = detectAdditionalPropertiesTightening(diff, index);
    expect(result.entries).toEqual([
      {
        id: REQUEST_ADDITIONAL_PROPERTIES_TIGHTENED_ID,
        level: 3,
        text: TIGHTENING_TEXT,
        operation: 'POST',
        path: '/api/test',
        source: '/components/schemas/Body',
      },
    ]);
  });

  it('walks oneOf branches in the structural diff and emits with /oneOf/<index> source pointers', () => {
    const diff = inlineDiff({
      oneOf: {
        modified: [
          {
            base: { index: 0 },
            revision: { index: 0 },
            diff: { additionalPropertiesAllowed: { from: null, to: false } },
          },
        ],
      },
    });
    const result = detectAdditionalPropertiesTightening(diff, new Map());
    expect(result.entries).toEqual([
      {
        id: REQUEST_ADDITIONAL_PROPERTIES_TIGHTENED_ID,
        level: 3,
        text: TIGHTENING_TEXT,
        operation: 'POST',
        path: '/api/test',
        source: '/requestBody/content/application/json/schema/oneOf/0',
      },
    ]);
  });

  it('walks allOf branches in the structural diff', () => {
    const diff = inlineDiff({
      allOf: {
        modified: [
          {
            base: { index: 0 },
            revision: { index: 0 },
            diff: { additionalPropertiesAllowed: { from: null, to: false } },
          },
        ],
      },
    });
    const result = detectAdditionalPropertiesTightening(diff, new Map());
    expect(result.entries).toEqual([
      {
        id: REQUEST_ADDITIONAL_PROPERTIES_TIGHTENED_ID,
        level: 3,
        text: TIGHTENING_TEXT,
        operation: 'POST',
        path: '/api/test',
        source: '/requestBody/content/application/json/schema/allOf/0',
      },
    ]);
  });

  it('walks anyOf branches in the structural diff', () => {
    const diff = inlineDiff({
      anyOf: {
        modified: [
          {
            base: { index: 1 },
            revision: { index: 1 },
            diff: { additionalPropertiesAllowed: { from: true, to: false } },
          },
        ],
      },
    });
    const result = detectAdditionalPropertiesTightening(diff, new Map());
    expect(result.entries).toEqual([
      {
        id: REQUEST_ADDITIONAL_PROPERTIES_TIGHTENED_ID,
        level: 3,
        text: TIGHTENING_TEXT,
        operation: 'POST',
        path: '/api/test',
        source: '/requestBody/content/application/json/schema/anyOf/0',
      },
    ]);
  });
});
