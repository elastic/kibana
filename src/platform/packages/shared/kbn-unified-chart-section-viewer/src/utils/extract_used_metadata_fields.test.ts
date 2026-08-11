/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractUsedMetadataFields } from './extract_used_metadata_fields';

describe('extractUsedMetadataFields', () => {
  it('returns empty array when metadataFields is empty', () => {
    expect(extractUsedMetadataFields({ metadataFields: [], filters: ['_id == "a"'] })).toEqual([]);
  });

  it('returns empty array when filters is empty', () => {
    expect(extractUsedMetadataFields({ metadataFields: ['_id'], filters: [] })).toEqual([]);
  });

  it('returns empty array when none of the metadata fields are referenced in filters', () => {
    expect(
      extractUsedMetadataFields({
        metadataFields: ['_id', '_index'],
        filters: ['host.name == "foo"'],
      })
    ).toEqual([]);
  });

  it('returns only the fields referenced in filters', () => {
    expect(
      extractUsedMetadataFields({
        metadataFields: ['_id', '_index'],
        filters: ['_id == "abc" AND service.name == "svc"'],
      })
    ).toEqual(['_id']);
  });

  it('does not match partial field names', () => {
    expect(
      extractUsedMetadataFields({
        metadataFields: ['_id'],
        filters: ['_id2 == "abc"'],
      })
    ).toEqual([]);
  });

  it('supports multiple metadata fields', () => {
    expect(
      extractUsedMetadataFields({
        metadataFields: ['_id', '_index'],
        filters: ['_index == "idx" AND _id == "abc"'],
      })
    ).toEqual(['_id', '_index']);
  });
});
