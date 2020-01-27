/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { DateFormatEditor } from './date';

const fieldType = 'date';
const format = {
  getConverterFor: jest.fn().mockImplementation(() => input => `converted date for ${input}`),
  getParamDefaults: jest.fn().mockImplementation(() => {
    return { pattern: 'MMMM Do YYYY, HH:mm:ss.SSS' };
  }),
};
const formatParams = {};
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
        format={format}
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
