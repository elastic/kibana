/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import FieldIcon from './field_icon';
import { getFieldIconProps } from './get_field_icon_props';

const dateField = dataView.getFieldByName('@timestamp')!;
const scriptedField = dataView.getFieldByName('script date')!;

describe('FieldUtils <FieldIcon />', () => {
  test('renders properly', () => {
    const component = shallow(<FieldIcon {...getFieldIconProps(dateField)} />);
    expect(component).toMatchSnapshot();
  });

  test('renders properly scripted fields', () => {
    const component = shallow(<FieldIcon {...getFieldIconProps(scriptedField)} />);
    expect(component).toMatchSnapshot();
  });

  test('accepts additional props', () => {
    const component = shallow(<FieldIcon {...getFieldIconProps(dateField)} fill="none" />);
    expect(component).toMatchSnapshot();
  });

  test('renders Document type properly', () => {
    const component = shallow(<FieldIcon type="document" />);
    expect(component).toMatchSnapshot();
  });
});
