/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import {
  convertFieldsToFallbackFields,
  getAllFallbackFields,
  getAssociatedSmartFieldsAsString,
} from './fallback_fields';

const fieldOne = new DataViewField({
  name: 'SMART_FIELD_ONE',
  type: 'smart_field',
  searchable: false,
  aggregatable: false,
});

const fieldTwo = new DataViewField({
  name: 'SMART_FIELD_TWO',
  type: 'smart_field',
  searchable: false,
  aggregatable: false,
});

const fieldThree = new DataViewField({
  name: 'SMART_FIELD_THREE',
  type: 'smart_field',
  searchable: false,
  aggregatable: false,
});

const fieldFour = new DataViewField({
  name: 'SMART_FIELD_FOUR',
  type: 'smart_field',
  searchable: false,
  aggregatable: false,
});

const FIELDS_INFO = {
  fields: ['SMART_FIELD_ONE', 'SMART_FIELD_TWO', 'SMART_FIELD_THREE', 'SMART_FIELD_FOUR'],
  additionalFieldGroups: {
    smartFields: [fieldOne, fieldTwo, fieldThree, fieldFour],
    fallbackFields: {
      SMART_FIELD_ONE: ['field1_fallback_one'],
      SMART_FIELD_TWO: ['field2_fallback_one', 'field2_fallback_two'],
      SMART_FIELD_THREE: ['field3_fallback_one', 'field3_fallback_two', 'field3_fallback_three'],
      SMART_FIELD_FOUR: ['field4_fallback_one'],
    },
  },
};

describe('Fallback field utils', () => {
  it('should convert fields to fallback fields where necessary', () => {
    expect(convertFieldsToFallbackFields(FIELDS_INFO)).toEqual([
      'field1_fallback_one',
      'field2_fallback_one',
      'field2_fallback_two',
      'field3_fallback_one',
      'field3_fallback_two',
      'field3_fallback_three',
      'field4_fallback_one',
    ]);
  });

  it('can provide associated smart fields', () => {
    const asString = getAssociatedSmartFieldsAsString(
      'field3_fallback_two',
      FIELDS_INFO.additionalFieldGroups
    );
    expect(asString).toEqual('SMART_FIELD_THREE');
  });

  it('can provide a list of all fallback fields', () => {
    const fallbackFields = getAllFallbackFields(FIELDS_INFO.additionalFieldGroups);
    expect(fallbackFields).toEqual([
      'field1_fallback_one',
      'field2_fallback_one',
      'field2_fallback_two',
      'field3_fallback_one',
      'field3_fallback_two',
      'field3_fallback_three',
      'field4_fallback_one',
    ]);
  });
});
