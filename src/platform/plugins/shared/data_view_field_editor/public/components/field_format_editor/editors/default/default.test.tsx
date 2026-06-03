/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SampleInput } from '../../types';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { convertSampleInput, DefaultFormatEditor, defaultState } from './default';
import { createFieldFormatMock } from '../test_utils';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

const fieldType = 'number';

const format = createFieldFormatMock({
  convertToReact: jest.fn().mockImplementation(() => null),
});

const formatParams = {};

const onChange = jest.fn();
const onError = jest.fn();

class TestDefaultFormatEditor extends DefaultFormatEditor {
  state = {
    ...defaultState,
    sampleInputs: [1],
  };

  render() {
    return <button onClick={() => this.onChange()}>Update format</button>;
  }
}

const renderDefaultFormatEditor = () =>
  renderWithI18n(
    <DefaultFormatEditor
      fieldType={fieldType}
      format={format}
      formatParams={formatParams}
      onChange={onChange}
      onError={onError}
    />
  );

describe('DefaultFormatEditor', () => {
  beforeEach(() => {
    onChange.mockClear();
    onError.mockClear();
  });

  describe('convertSampleInput', () => {
    const converter = (input: SampleInput) => {
      if (typeof input !== 'number') {
        throw new Error('Input is not a number');
      } else {
        return (input * 2).toString();
      }
    };

    it('should convert a set of inputs', () => {
      const inputs = [1, 10, 15];
      const output = convertSampleInput(converter, inputs);

      expect(output.error).toBeUndefined();
      expect(JSON.stringify(output.samples)).toEqual(
        JSON.stringify([
          { input: 1, output: '2' },
          { input: 10, output: '20' },
          { input: 15, output: '30' },
        ])
      );
    });

    it('should return error if converter throws one', () => {
      const inputs = [1, 10, 15, 'invalid'];
      const output = convertSampleInput(converter, inputs);

      expect(output.error).toEqual(
        'An error occurred while trying to use this format configuration: Input is not a number'
      );
      expect(JSON.stringify(output.samples)).toEqual(JSON.stringify([]));
    });
  });

  it('should render nothing', () => {
    const { container } = renderDefaultFormatEditor();

    expect(onError).toBeCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('should call prop onChange()', async () => {
    const user = userEvent.setup();

    renderWithI18n(
      <TestDefaultFormatEditor
        fieldType={fieldType}
        format={format}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    await user.click(screen.getByText('Update format'));

    expect(onChange).toHaveBeenCalledWith(formatParams);
  });

  it('should call prop onError() if converter throws an error', () => {
    const newFormat = createFieldFormatMock({
      convertToReact: jest.fn().mockImplementation(() => {
        throw new Error('Test error message');
      }),
    });

    renderWithI18n(
      <TestDefaultFormatEditor
        fieldType={fieldType}
        format={newFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(onError).toHaveBeenCalledWith(
      'An error occurred while trying to use this format configuration: Test error message'
    );
  });
});
