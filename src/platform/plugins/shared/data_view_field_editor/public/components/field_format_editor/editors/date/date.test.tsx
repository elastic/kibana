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
import { DateFormatEditor } from './date';
import { formatId } from './constants';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

const fieldType = 'date';

const format = createFieldFormatMock({
  getParamDefaults: jest.fn().mockImplementation(() => {
    return { pattern: 'MMMM Do YYYY, HH:mm:ss.SSS' };
  }),
  convertToReact: jest.fn().mockImplementation((input: string) => `converted date for ${input}`),
});

const formatParams = { pattern: '' };

const mockedTimeNow = 1529097045190;

const onChange = jest.fn();
const onError = jest.fn();

const renderDateFormatEditor = () =>
  renderWithI18n(
    <DateFormatEditor
      fieldType={fieldType}
      format={format}
      formatParams={formatParams}
      onChange={onChange}
      onError={onError}
    />
  );

describe('DateFormatEditor', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(mockedTimeNow);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should have a formatId', () => {
    expect(DateFormatEditor.formatId).toEqual(formatId);
  });

  it('should render normally', () => {
    renderDateFormatEditor();

    expect(
      screen.getByText((_, element) =>
        Boolean(
          element?.tagName === 'LABEL' &&
            element?.textContent?.includes(
              'Moment.js format pattern (Default: MMMM Do YYYY, HH:mm:ss.SSS)'
            )
        )
      )
    ).toBeVisible();
    expect(screen.getByText('MMMM Do YYYY, HH:mm:ss.SSS')).toBeVisible();
    expect(screen.getByText('Documentation')).toBeVisible();
    expect(screen.getByText(mockedTimeNow)).toBeVisible();
    expect(screen.getByText(`converted date for ${mockedTimeNow}`)).toBeVisible();
  });
});
