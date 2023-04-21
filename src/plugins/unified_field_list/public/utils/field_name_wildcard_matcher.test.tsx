/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type DataViewField } from '@kbn/data-views-plugin/common';
import { fieldNameWildcardMatcher } from './field_name_wildcard_matcher';

describe('UnifiedFieldList fieldNameWildcardMatcher()', () => {
  it('should work correctly', async () => {
    expect(fieldNameWildcardMatcher({ displayName: 'test' } as DataViewField, 'no')).toBe(false);
    expect(
      fieldNameWildcardMatcher({ displayName: 'test', name: 'yes' } as DataViewField, 'yes')
    ).toBe(true);

    const search = 'test*ue';
    expect(fieldNameWildcardMatcher({ displayName: 'test' } as DataViewField, search)).toBe(false);
    expect(fieldNameWildcardMatcher({ displayName: 'test.value' } as DataViewField, search)).toBe(
      true
    );
    expect(fieldNameWildcardMatcher({ name: 'test.this_value' } as DataViewField, search)).toBe(
      true
    );
    expect(fieldNameWildcardMatcher({ name: 'message.test' } as DataViewField, search)).toBe(false);
    expect(
      fieldNameWildcardMatcher({ name: 'test.this_value.maybe' } as DataViewField, search)
    ).toBe(false);
    expect(
      fieldNameWildcardMatcher({ name: 'test.this_value.maybe' } as DataViewField, `${search}*`)
    ).toBe(true);
    expect(
      fieldNameWildcardMatcher({ name: 'test.this_value.maybe' } as DataViewField, '*value*')
    ).toBe(true);
  });
});
