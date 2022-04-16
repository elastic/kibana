/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';

import { HistogramFormatEditor } from './histogram';

const fieldType = 'histogram';
const format = {
  getConverterFor: jest
    .fn()
    .mockImplementation(
      () => (input: number | Record<string, number[]>) =>
        typeof input === 'number' ? input.toFixed(2) : JSON.stringify(input)
    ),
  getParamDefaults: jest.fn().mockImplementation(() => {
    return { id: 'number', params: {} };
  }),
};
const formatParams = {
  type: 'histogram',
  id: 'number' as const,
  params: {},
};
const onChange = jest.fn();
const onError = jest.fn();

describe('HistogramFormatEditor', () => {
  it('should have a formatId', () => {
    expect(HistogramFormatEditor.formatId).toEqual('histogram');
  });

  it('should render normally', async () => {
    const component = shallow(
      <HistogramFormatEditor
        fieldType={fieldType}
        format={format as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
