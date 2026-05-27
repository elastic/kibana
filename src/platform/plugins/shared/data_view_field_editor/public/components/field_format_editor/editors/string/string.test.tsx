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
import { formatId } from './constants';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { StringFormatEditor } from './string';

const fieldType = 'string';

const format = createFieldFormatMock({
  getParamDefaults: jest.fn().mockImplementation(() => {
    return { transform: 'upper' };
  }),
  convertToReact: jest.fn().mockImplementation((input: string) => input.toUpperCase()),
  type: {
    transformOptions: [
      {
        kind: 'upper',
        text: 'Upper Case',
      },
    ],
  },
});

const formatParams = {
  transform: '',
};

const onChange = jest.fn();
const onError = jest.fn();

const renderStringFormatEditor = () =>
  renderWithI18n(
    <StringFormatEditor
      fieldType={fieldType}
      format={format}
      formatParams={formatParams}
      onChange={onChange}
      onError={onError}
    />
  );

describe('StringFormatEditor', () => {
  it('should have a formatId', () => {
    expect(StringFormatEditor.formatId).toEqual(formatId);
  });

  it('should render normally', () => {
    renderStringFormatEditor();

    expect(screen.getByText('Transform')).toBeVisible();
    expect(screen.getByText('Upper Case')).toBeVisible();
    expect(screen.getByText('A Quick Brown Fox.')).toBeVisible();
    expect(screen.getByText('A QUICK BROWN FOX.')).toBeVisible();
  });
});
