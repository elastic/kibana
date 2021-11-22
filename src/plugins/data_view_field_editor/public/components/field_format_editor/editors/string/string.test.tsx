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

import { StringFormatEditor } from './string';

const fieldType = 'string';
const format = {
  getConverterFor: jest.fn().mockImplementation(() => (input: string) => input.toUpperCase()),
  getParamDefaults: jest.fn().mockImplementation(() => {
    return { transform: 'upper' };
  }),
  type: {
    transformOptions: [
      {
        kind: 'upper',
        text: 'Upper Case',
      },
    ],
  },
};
const formatParams = {
  transform: '',
};
const onChange = jest.fn();
const onError = jest.fn();

describe('StringFormatEditor', () => {
  it('should have a formatId', () => {
    expect(StringFormatEditor.formatId).toEqual('string');
  });

  it('should render normally', async () => {
    const component = shallow(
      <StringFormatEditor
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
