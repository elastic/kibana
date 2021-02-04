/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
