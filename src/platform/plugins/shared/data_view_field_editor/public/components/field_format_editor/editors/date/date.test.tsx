/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';

import { DateFormatEditor } from './date';

const fieldType = 'date';
const format = {
  getConverterFor: jest
    .fn()
    .mockImplementation(() => (input: string) => `converted date for ${input}`),
  getParamDefaults: jest.fn().mockImplementation(() => {
    return { pattern: 'MMMM Do YYYY, HH:mm:ss.SSS' };
  }),
};
const formatParams = { pattern: '' };
const onChange = jest.fn();
const onError = jest.fn();

const renderWithIntl = (component: React.ReactElement) => {
  return render(
    <IntlProvider locale="en">
      {component}
    </IntlProvider>
  );
};
describe('DateFormatEditor', () => {
  it('should have a formatId', () => {
    expect(DateFormatEditor.formatId).toEqual('date');
  });

  it('should render normally', async () => {
    const { container } = renderWithIntl(
      <DateFormatEditor
        fieldType={fieldType}
        format={format as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(container).toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });
});
