/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { FieldFormat } from 'src/plugins/data/public';

import { NumberFormatEditor } from './number';

const fieldType = 'number';
const format = {
  getConverterFor: jest.fn().mockImplementation(() => (input: number) => input * 2),
  getParamDefaults: jest.fn().mockImplementation(() => {
    return { pattern: '0,0.[000]' };
  }),
};
const formatParams = {
  pattern: '',
};
const onChange = jest.fn();
const onError = jest.fn();

describe('NumberFormatEditor', () => {
  it('should have a formatId', () => {
    expect(NumberFormatEditor.formatId).toEqual('number');
  });

  it('should render normally', async () => {
    const component = shallow(
      <NumberFormatEditor
        fieldType={fieldType}
        format={(format as unknown) as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
