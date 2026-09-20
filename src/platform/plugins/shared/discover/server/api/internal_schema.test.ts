/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMeta } from '@kbn/as-code-shared-schemas';
import {
  MAX_SAVED_OBJECT_ID_LENGTH,
  MAX_SAVED_OBJECT_NAME_LENGTH,
  MAX_SAVED_OBJECT_TYPE_LENGTH,
  MAX_SAVED_OBJECT_VERSION_LENGTH,
} from '@kbn/core-saved-objects-server';
import {
  discoverSessionInternalDataSchema,
  discoverSessionInternalParamsSchema,
  discoverSessionInternalResponseSchema,
} from './internal_schema';
import { discoverSessionAttributes } from './transforms/transform_discover_session.fixtures';

describe('Discover session internal schemas', () => {
  const data = {
    attributes: discoverSessionAttributes,
    references: [{ name: 'tag-1', type: 'tag', id: 'tag-1' }],
  };

  it('accepts stored state without converting inline IDs, charts, or controls', () => {
    expect(discoverSessionInternalDataSchema.validate(data)).toEqual(data);
  });

  it('requires references and rejects a public document in place of stored attributes', () => {
    expect(() =>
      discoverSessionInternalDataSchema.validate({ attributes: discoverSessionAttributes })
    ).toThrow(/references/);
    expect(() =>
      discoverSessionInternalDataSchema.validate({ title: 'Session', tabs: [], references: [] })
    ).toThrow();
    expect(() =>
      discoverSessionInternalDataSchema.validate({
        ...data,
        attributes: { ...data.attributes, tabs: [] },
      })
    ).toThrow(/attributes.tabs/);
  });

  it('accepts a reference name generated from a long legacy tab ID', () => {
    const tabId = 'a'.repeat(MAX_SAVED_OBJECT_ID_LENGTH);
    const reference = {
      ...data.references[0],
      name: `tab_${tabId}.kibanaSavedObjectMeta.searchSourceJSON.filter[9999].meta.index`,
    };
    expect(
      discoverSessionInternalDataSchema.validate({ ...data, references: [reference] }).references
    ).toEqual([reference]);
  });

  it.each([
    { property: 'id', maxLength: MAX_SAVED_OBJECT_ID_LENGTH },
    { property: 'type', maxLength: MAX_SAVED_OBJECT_TYPE_LENGTH },
    { property: 'name', maxLength: MAX_SAVED_OBJECT_NAME_LENGTH },
  ])('uses the Saved Objects limit for reference $property', ({ property, maxLength }) => {
    const reference = { ...data.references[0], [property]: 'a'.repeat(maxLength) };
    expect(
      discoverSessionInternalDataSchema.validate({ ...data, references: [reference] }).references
    ).toEqual([reference]);
    expect(
      discoverSessionInternalResponseSchema.validate({
        id: 'session-id',
        data: { ...data, references: [reference] },
        meta: {},
      }).data.references
    ).toEqual([reference]);
    expect(() =>
      discoverSessionInternalDataSchema.validate({
        ...data,
        references: [{ ...data.references[0], [property]: 'a'.repeat(maxLength + 1) }],
      })
    ).toThrow(new RegExp(`references.0.${property}`));
  });

  it('retains the existing Content Management reference count limit', () => {
    expect(() =>
      discoverSessionInternalDataSchema.validate({
        ...data,
        references: Array.from({ length: 10_001 }, () => data.references[0]),
      })
    ).toThrow(/references/);
  });

  it('accepts legacy IDs in route parameters without applying creation naming rules', () => {
    const id = 'L'.repeat(MAX_SAVED_OBJECT_ID_LENGTH);
    expect(discoverSessionInternalParamsSchema.validate({ id })).toEqual({ id });
    const response = { id, data, meta: {} };
    expect(discoverSessionInternalResponseSchema.validate(response)).toEqual(response);
    expect(() =>
      discoverSessionInternalParamsSchema.validate({
        id: 'a'.repeat(MAX_SAVED_OBJECT_ID_LENGTH + 1),
      })
    ).toThrow(/id/);
    expect(() =>
      discoverSessionInternalResponseSchema.validate({
        ...response,
        id: 'a'.repeat(MAX_SAVED_OBJECT_ID_LENGTH + 1),
      })
    ).toThrow(/id/);
  });

  it('preserves the same metadata projection as public responses', () => {
    const meta = getMeta({
      created_at: '2026-09-20T10:00:00.000Z',
      created_by: 'creator',
      updated_at: '2026-09-20T11:00:00.000Z',
      updated_by: 'editor',
      managed: true,
      version: 'WzEsMV0=',
    });
    const response = { id: 'session-id', data, meta };
    expect(discoverSessionInternalResponseSchema.validate(response)).toEqual(response);
  });

  it('does not apply creation-ID limits to output metadata identifiers', () => {
    const identifier = 'a'.repeat(MAX_SAVED_OBJECT_ID_LENGTH);
    const response = {
      id: 'session-id',
      data,
      meta: { created_by: identifier, updated_by: identifier, owner: identifier },
    };
    expect(discoverSessionInternalResponseSchema.validate(response)).toEqual(response);
  });

  it('uses the Saved Objects version length limit', () => {
    const response = {
      id: 'session-id',
      data,
      meta: { version: 'a'.repeat(MAX_SAVED_OBJECT_VERSION_LENGTH) },
    };
    expect(discoverSessionInternalResponseSchema.validate(response)).toEqual(response);
    expect(() =>
      discoverSessionInternalResponseSchema.validate({
        ...response,
        meta: { version: 'a'.repeat(MAX_SAVED_OBJECT_VERSION_LENGTH + 1) },
      })
    ).toThrow(/meta.version/);
  });
});
