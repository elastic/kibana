/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type DataViewField } from '@kbn/data-views-plugin/common';
import {
  fieldNameWildcardMatcher,
  getFieldSearchMatchingHighlight,
} from './field_name_wildcard_matcher';

const name = 'test.this_value.maybe';
describe('fieldNameWildcardMatcher', function () {
  describe('fieldNameWildcardMatcher()', () => {
    it('should work correctly with wildcard', async () => {
      expect(fieldNameWildcardMatcher({ displayName: 'test' } as DataViewField, 'no')).toBe(false);
      expect(
        fieldNameWildcardMatcher({ displayName: 'test', name: 'yes' } as DataViewField, 'yes')
      ).toBe(true);

      const search = 'test*ue';
      expect(fieldNameWildcardMatcher({ displayName: 'test' } as DataViewField, search)).toBe(
        false
      );
      expect(fieldNameWildcardMatcher({ displayName: 'test.value' } as DataViewField, search)).toBe(
        true
      );
      expect(fieldNameWildcardMatcher({ name: 'test.this_value' } as DataViewField, search)).toBe(
        true
      );
      expect(fieldNameWildcardMatcher({ name: 'message.test' } as DataViewField, search)).toBe(
        false
      );
      expect(fieldNameWildcardMatcher({ name } as DataViewField, search)).toBe(false);
      expect(fieldNameWildcardMatcher({ name } as DataViewField, `${search}*`)).toBe(true);
      expect(fieldNameWildcardMatcher({ name } as DataViewField, '*value*')).toBe(true);
    });

    it('should work correctly with spaces', async () => {
      expect(fieldNameWildcardMatcher({ name } as DataViewField, 'test maybe    ')).toBe(true);
      expect(fieldNameWildcardMatcher({ name } as DataViewField, 'test maybe*')).toBe(true);
      expect(fieldNameWildcardMatcher({ name } as DataViewField, 'test. this')).toBe(true);
      expect(fieldNameWildcardMatcher({ name } as DataViewField, 'this      _value be')).toBe(true);
      expect(fieldNameWildcardMatcher({ name } as DataViewField, 'test')).toBe(true);
      expect(fieldNameWildcardMatcher({ name } as DataViewField, 'this')).toBe(true);
      expect(fieldNameWildcardMatcher({ name } as DataViewField, '  value  ')).toBe(true);
      expect(fieldNameWildcardMatcher({ name } as DataViewField, 'be')).toBe(true);
      expect(fieldNameWildcardMatcher({ name } as DataViewField, 'test this here')).toBe(false);
      expect(fieldNameWildcardMatcher({ name } as DataViewField, 'test that')).toBe(false);
      expect(fieldNameWildcardMatcher({ name } as DataViewField, '    ')).toBe(false);
      expect(fieldNameWildcardMatcher({ name: 'geo.location3' } as DataViewField, '3')).toBe(true);
      expect(fieldNameWildcardMatcher({ name: 'geo_location3' } as DataViewField, 'geo 3')).toBe(
        true
      );
    });

    it('should be case-insensitive', async () => {
      expect(fieldNameWildcardMatcher({ name: 'Test' } as DataViewField, 'test')).toBe(true);
      expect(fieldNameWildcardMatcher({ name: 'test' } as DataViewField, 'Test')).toBe(true);
      expect(fieldNameWildcardMatcher({ name: 'tesT' } as DataViewField, 'Tes*')).toBe(true);
      expect(fieldNameWildcardMatcher({ name: 'tesT' } as DataViewField, 'tes*')).toBe(true);
      expect(fieldNameWildcardMatcher({ name: 'tesT' } as DataViewField, 't T')).toBe(true);
      expect(fieldNameWildcardMatcher({ name: 'tesT' } as DataViewField, 't t')).toBe(true);
    });
  });

  describe('getFieldSearchMatchingHighlight()', function () {
    it('should correctly return only partial match', async () => {
      expect(getFieldSearchMatchingHighlight('test this', 'test')).toBe('test');
      expect(getFieldSearchMatchingHighlight('test this', 'this')).toBe('this');
      expect(getFieldSearchMatchingHighlight('test this')).toBe('');
    });

    it('should correctly return a full match for a wildcard search', async () => {
      expect(getFieldSearchMatchingHighlight('Test this', 'test*')).toBe('Test this');
      expect(getFieldSearchMatchingHighlight('test this', '*this')).toBe('test this');
      expect(getFieldSearchMatchingHighlight('test this', ' te th')).toBe('test this');
    });
  });
});
