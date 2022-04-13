/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from 'src/plugins/data_views/common';
import { getTypeForFieldIcon } from './get_type_for_field_icon';

describe('getTypeForFieldIcon', () => {
  it('extracts type for non-string types', () => {
    expect(
      getTypeForFieldIcon({
        type: 'not-string',
        esTypes: ['bar'],
      } as DataViewField)
    ).toBe('not-string');
  });

  it('extracts type when type is string but esTypes is unavailable', () => {
    expect(
      getTypeForFieldIcon({
        type: 'string',
        esTypes: undefined,
      } as DataViewField)
    ).toBe('string');
  });

  it('extracts esType when type is string and esTypes is available', () => {
    expect(
      getTypeForFieldIcon({
        type: 'string',
        esTypes: ['version'],
      } as DataViewField)
    ).toBe('version');
  });
});
