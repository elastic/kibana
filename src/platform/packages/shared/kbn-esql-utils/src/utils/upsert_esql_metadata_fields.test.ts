/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { upsertESQLMetadataFields } from './upsert_esql_metadata_fields';

const REQUIRED_METADATA_FIELDS = ['_index', '_id'] as const;

describe('upsertESQLMetadataFields', () => {
  it.each([
    ['FROM logs-*', 'FROM logs-* METADATA _index, _id'],
    ['TS metrics-*', 'TS metrics-* METADATA _index, _id'],
    [
      'FROM logs-*\n  | WHERE level == "error"',
      'FROM logs-* METADATA _index, _id\n  | WHERE level == "error"',
    ],
  ])('adds missing metadata fields to %s', (query, expected) => {
    expect(upsertESQLMetadataFields(query, REQUIRED_METADATA_FIELDS)).toBe(expected);
  });

  it('appends only missing fields to existing metadata', () => {
    expect(
      upsertESQLMetadataFields(
        'FROM logs-* METADATA _ignored, _id | WHERE level == "error"',
        REQUIRED_METADATA_FIELDS
      )
    ).toBe('FROM logs-* METADATA _ignored, _id, _index | WHERE level == "error"');
  });

  it('preserves the query exactly when all fields are already present', () => {
    const query = 'FROM logs-*  METADATA _id,  _index\n  | WHERE level == "error"';

    expect(upsertESQLMetadataFields(query, REQUIRED_METADATA_FIELDS)).toBe(query);
  });

  it('does not duplicate requested fields', () => {
    expect(upsertESQLMetadataFields('FROM logs-*', ['_id', '_id'])).toBe(
      'FROM logs-* METADATA _id'
    );
  });

  it('is idempotent', () => {
    const updatedQuery = upsertESQLMetadataFields('FROM logs-*', REQUIRED_METADATA_FIELDS);

    expect(upsertESQLMetadataFields(updatedQuery, REQUIRED_METADATA_FIELDS)).toBe(updatedQuery);
  });

  it('keeps a trailing source comment valid', () => {
    expect(
      upsertESQLMetadataFields(
        'FROM logs-* // source comment\n| WHERE level == "error"',
        REQUIRED_METADATA_FIELDS
      )
    ).toBe('FROM logs-* METADATA _index, _id // source comment\n| WHERE level == "error"');
  });

  it.each([
    'ROW value = 1',
    'PROMQL metrics-*',
    'FROM',
    'FROM logs-* METADATA',
    'FROM logs-* | WHERE',
  ])('returns unsupported or incomplete query unchanged: %s', (query) => {
    expect(upsertESQLMetadataFields(query, REQUIRED_METADATA_FIELDS)).toBe(query);
  });
});
