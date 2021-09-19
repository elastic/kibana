/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import type { FieldFormat } from 'src/plugins/field_formats/common';

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

describe('DateFormatEditor', () => {
  it('should have a formatId', () => {
    expect(DateFormatEditor.formatId).toEqual('date');
  });

  it('should render normally', async () => {
    const component = shallow(
      <DateFormatEditor
        fieldType={fieldType}
        format={format as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    // Date editor samples uses changing values - Date.now() - so we
    // hardcode samples to avoid ever-changing snapshots
    component.setState({
      sampleInputs: [1529097045190, 1514793600000, 1546329599999],
    });

    component.instance().forceUpdate();
    component.update();
    expect(component).toMatchSnapshot();
  });
});
