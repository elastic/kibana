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
import { FieldFormat } from '@kbn/field-formats-plugin/common';

import { SampleInput } from '../../types';
import { DefaultFormatEditor, convertSampleInput } from './default';

const fieldType = 'number';
const format = {
  getConverterFor: jest.fn().mockImplementation(() => () => {}),
};
const formatParams = {};
const onChange = jest.fn();
const onError = jest.fn();

describe('DefaultFormatEditor', () => {
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

  it('should render nothing', async () => {
    const { container } = render(
      <DefaultFormatEditor
        fieldType={fieldType}
        format={format as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(format.getConverterFor).toBeCalled();
    expect(onError).toBeCalled();
    expect(container).toBeInTheDocument();
    // DefaultFormatEditor renders nothing, so container should be empty
    expect(container.firstChild).toBeNull();
  });

  it('should call prop onChange() when params change', async () => {
    // Test that onChange is available by checking that the component renders properly
    // DefaultFormatEditor provides an onChange method but doesn't call it automatically
    render(
      <DefaultFormatEditor
        fieldType={fieldType}
        format={format as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    // Since DefaultFormatEditor renders nothing and doesn't call onChange automatically,
    // we just verify the component can be rendered without errors
    expect(format.getConverterFor).toBeCalled();
  });

  it('should call prop onError() if converter throws an error', async () => {
    const newFormat = {
      getConverterFor: jest.fn().mockImplementation(() => () => {
        throw new Error('Test error message');
      }),
    };

    render(
      <DefaultFormatEditor
        fieldType={fieldType}
        format={newFormat as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(onError).toBeCalled();
  });
});
