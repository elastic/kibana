/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { createFieldFormatMock } from '../test_utils';
import { formatId } from './constants';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { sample } from './sample';
import { screen } from '@testing-library/react';
import { TruncateFormatEditor } from './truncate';

const fieldType = 'string';

const format = createFieldFormatMock({
  getParamDefaults: jest.fn().mockImplementation(() => ({ fieldLength: 10 })),
  convertToReact: jest.fn().mockImplementation((input: string) => input.substring(0, 10)),
});

const formatParams = {
  fieldLength: 5,
};

const onChange = jest.fn();
const onError = jest.fn();

const renderTruncateFormatEditor = () =>
  renderWithI18n(
    <TruncateFormatEditor
      fieldType={fieldType}
      format={format}
      formatParams={formatParams}
      onChange={onChange}
      onError={onError}
    />
  );

describe('TruncateFormatEditor', () => {
  beforeEach(() => {
    onChange.mockClear();
    onError.mockClear();
  });

  it('should have a formatId', () => {
    expect(TruncateFormatEditor.formatId).toEqual(formatId);
  });

  it('should render normally', () => {
    renderTruncateFormatEditor();

    expect(screen.getByText('Field length')).toBeVisible();
    expect(screen.getByDisplayValue('5')).toBeVisible();
    expect(screen.getByText(sample)).toBeVisible();
    expect(screen.getByText('Lorem ipsu')).toBeVisible();
  });

  it('should fire error, when input is invalid', async () => {
    const user = userEvent.setup();

    renderTruncateFormatEditor();

    const input = screen.getByTestId('truncateEditorLength');

    await user.clear(input);
    onChange.mockClear();
    onError.mockClear();

    await user.type(input, '-5');

    expect(onError).toHaveBeenCalledWith('Constraints not satisfied');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should fire change, when input changed and is valid', async () => {
    const user = userEvent.setup();

    renderTruncateFormatEditor();

    const input = screen.getByTestId('truncateEditorLength');

    await user.clear(input);
    onChange.mockClear();
    onError.mockClear();

    await user.type(input, '123');

    expect(onError).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith({ fieldLength: 123 });
  });
});
