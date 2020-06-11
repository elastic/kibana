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
import { FieldIcon, typeToEuiIconMap } from './field_icon';

const availableTypes = Object.keys(typeToEuiIconMap);

describe('FieldIcon renders known field types', () => {
  availableTypes.forEach((type) => {
    test(`${type} is rendered`, () => {
      const component = shallow(<FieldIcon type={type} />);
      expect(component).toMatchSnapshot();
    });
  });
});

test('FieldIcon renders an icon for an unknown type', () => {
  const component = shallow(<FieldIcon type="sdfsdf" label="test" />);
  expect(component).toMatchSnapshot();
});

test('FieldIcon supports same props as EuiToken', () => {
  const component = shallow(
    <FieldIcon
      type="number"
      label="test"
      color="euiColorVis0"
      size="l"
      shape="circle"
      fill="none"
    />
  );
  expect(component).toMatchSnapshot();
});

test('FieldIcon changes fill when scripted is true', () => {
  const component = shallow(<FieldIcon type="number" label="test" scripted={true} />);
  expect(component).toMatchSnapshot();
});

test('FieldIcon renders with className if provided', () => {
  const component = shallow(<FieldIcon type="sdfsdf" label="test" className="myClass" />);
  expect(component).toMatchSnapshot();
});
