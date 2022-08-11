/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFieldValidityAndErrorMessage } from './helpers';
import { DataViewField } from '@kbn/data-views-plugin/common';

const mockField = {
  type: 'date',
} as DataViewField;

describe('Check field validity and error message', () => {
  it('should return a message that the entered date is not incorrect', () => {
    const output = getFieldValidityAndErrorMessage(mockField, Date());

    expect(output).toEqual({
      isInvalid: false,
    });
  });

  it('should show error', () => {
    const output = getFieldValidityAndErrorMessage(mockField, 'Date');

    expect(output).toEqual({
      isInvalid: true,
      errorMessage: 'Invalid date format provided',
    });
  });
});
