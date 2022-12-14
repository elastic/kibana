/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import { getFieldIconType } from './get_field_icon_type';

describe('UnifiedFieldList getFieldIconType()', () => {
  it('extracts type for non-string types', () => {
    expect(
      getFieldIconType({
        type: 'not-string',
        esTypes: ['bar'],
      } as DataViewField)
    ).toBe('not-string');
  });

  it('extracts type when type is string but esTypes is unavailable', () => {
    expect(
      getFieldIconType({
        type: 'string',
        esTypes: undefined,
      } as DataViewField)
    ).toBe('string');
  });

  it('extracts esType when type is string and esTypes is available', () => {
    expect(
      getFieldIconType({
        type: 'string',
        esTypes: ['version'],
      } as DataViewField)
    ).toBe('version');
  });

  it('extracts type for meta fields', () => {
    expect(
      getFieldIconType({
        type: 'string',
        esTypes: ['_id'],
      } as DataViewField)
    ).toBe('string');
  });
});
