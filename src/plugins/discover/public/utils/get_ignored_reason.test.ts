/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getIgnoredReason, IgnoredReason } from './get_ignored_reason';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';

function field(params: Partial<DataViewField>): DataViewField {
  return {
    name: 'text',
    type: 'keyword',
    ...params,
  } as unknown as DataViewField;
}

describe('getIgnoredReason', () => {
  it('will correctly return undefined when no value was ignored', () => {
    expect(getIgnoredReason(field({ name: 'foo' }), undefined)).toBeUndefined();
    expect(getIgnoredReason(field({ name: 'foo' }), ['bar', 'baz'])).toBeUndefined();
  });

  it('will return UNKNOWN if the field passed in was only a name, and thus no type information is present', () => {
    expect(getIgnoredReason('foo', ['foo'])).toBe(IgnoredReason.UNKNOWN);
  });

  it('will return IGNORE_ABOVE for string types', () => {
    expect(getIgnoredReason(field({ name: 'foo', type: KBN_FIELD_TYPES.STRING }), ['foo'])).toBe(
      IgnoredReason.IGNORE_ABOVE
    );
  });

  // Each type that can have malformed values
  [
    KBN_FIELD_TYPES.DATE,
    KBN_FIELD_TYPES.IP,
    KBN_FIELD_TYPES.GEO_POINT,
    KBN_FIELD_TYPES.GEO_SHAPE,
    KBN_FIELD_TYPES.NUMBER,
  ].forEach((type) => {
    it(`will return MALFORMED for ${type} fields`, () => {
      expect(getIgnoredReason(field({ name: 'foo', type }), ['foo'])).toBe(IgnoredReason.MALFORMED);
    });
  });

  it('will return unknown reasons if it does not know what the reason was', () => {
    expect(getIgnoredReason(field({ name: 'foo', type: 'range' }), ['foo'])).toBe(
      IgnoredReason.UNKNOWN
    );
  });
});
