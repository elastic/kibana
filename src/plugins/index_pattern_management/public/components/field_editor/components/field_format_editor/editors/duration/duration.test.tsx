/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { DurationFormatEditor } from './duration';
import { FieldFormat } from 'src/plugins/data/public';

const fieldType = 'number';
const format = {
  getConverterFor: jest
    .fn()
    .mockImplementation(() => (input: string) => `converted duration for ${input}`),
  getParamDefaults: jest.fn().mockImplementation(() => {
    return {
      inputFormat: 'seconds',
      outputFormat: 'humanize',
      outputPrecision: 10,
    };
  }),
  isHuman: () => true,
  type: {
    inputFormats: [
      {
        text: 'Seconds',
        kind: 'seconds',
      },
    ],
    outputFormats: [
      {
        text: 'Human Readable',
        method: 'humanize',
      },
      {
        text: 'Minutes',
        method: 'asMinutes',
      },
    ],
  },
};
const formatParams = {
  outputPrecision: 2,
  inputFormat: '',
  outputFormat: '',
};
const onChange = jest.fn();
const onError = jest.fn();

describe('DurationFormatEditor', () => {
  it('should have a formatId', () => {
    expect(DurationFormatEditor.formatId).toEqual('duration');
  });

  it('should render human readable output normally', async () => {
    const component = shallow(
      <DurationFormatEditor
        fieldType={fieldType}
        format={(format as unknown) as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('should render non-human readable output normally', async () => {
    const newFormat = {
      ...format,
      getParamDefaults: jest.fn().mockImplementation(() => {
        return {
          inputFormat: 'seconds',
          outputFormat: 'asMinutes',
          outputPrecision: 10,
        };
      }),
      isHuman: () => false,
    };
    const component = shallow(
      <DurationFormatEditor
        fieldType={fieldType}
        format={(newFormat as unknown) as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
