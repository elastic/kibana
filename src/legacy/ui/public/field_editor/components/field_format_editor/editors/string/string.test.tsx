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

import { StringFormatEditor } from './string';

const fieldType = 'string';
const format = {
  getConverterFor: jest.fn().mockImplementation(() => input => input.toUpperCase()),
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
const formatParams = {};
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
        format={format}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
