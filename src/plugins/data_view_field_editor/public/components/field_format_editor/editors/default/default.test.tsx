/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { FieldFormat } from 'src/plugins/field_formats/common';

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
    const component = shallow(
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
    expect(component).toMatchSnapshot();
  });

  it('should call prop onChange()', async () => {
    const component = shallow(
      <DefaultFormatEditor
        fieldType={fieldType}
        format={format as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    (component.instance() as DefaultFormatEditor).onChange();
    expect(onChange).toBeCalled();
  });

  it('should call prop onError() if converter throws an error', async () => {
    const newFormat = {
      getConverterFor: jest.fn().mockImplementation(() => () => {
        throw new Error('Test error message');
      }),
    };

    shallow(
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
