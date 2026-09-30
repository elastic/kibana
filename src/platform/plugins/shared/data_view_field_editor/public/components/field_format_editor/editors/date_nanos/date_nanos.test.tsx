/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createFieldFormatMock } from '../test_utils';
import { DateNanosFormatEditor } from './date_nanos';
import { formatId } from './constants';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

const fieldType = 'date_nanos';

const format = createFieldFormatMock({
  getParamDefaults: jest.fn().mockImplementation(() => {
    return { pattern: 'MMM D, YYYY @ HH:mm:ss.SSSSSSSSS' };
  }),
  convertToReact: jest.fn().mockImplementation((input: string) => `converted date for ${input}`),
});

const formatParams = {
  pattern: '',
};

const onChange = jest.fn();
const onError = jest.fn();

const renderDateNanosFormatEditor = () =>
  renderWithI18n(
    <DateNanosFormatEditor
      fieldType={fieldType}
      format={format}
      formatParams={formatParams}
      onChange={onChange}
      onError={onError}
    />
  );

describe('DateFormatEditor', () => {
  it('should have a formatId', () => {
    expect(DateNanosFormatEditor.formatId).toEqual(formatId);
  });

  it('should render normally', () => {
    renderDateNanosFormatEditor();

    expect(screen.getByText(/Moment\.js format pattern/i)).toBeVisible();
    expect(screen.getByText('MMM D, YYYY @ HH:mm:ss.SSSSSSSSS')).toBeVisible();
    expect(screen.getByText('Documentation')).toBeVisible();
    expect(screen.getByText('2015-01-01T12:10:30.123456789Z')).toBeVisible();
    expect(screen.getByText('converted date for 2015-01-01T12:10:30.123456789Z')).toBeVisible();
  });
});
