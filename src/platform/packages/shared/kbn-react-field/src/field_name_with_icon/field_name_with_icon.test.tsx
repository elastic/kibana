/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallow } from 'enzyme';
import { FieldNameWithIcon } from './field_name_with_icon';

test('FieldNameWithIcon renders an icon when type is passed', () => {
  const component = shallow(<FieldNameWithIcon name="agent.name" type="keyword" />);
  expect(component).toMatchSnapshot();
});

test('FieldNameWithIcon renders only the name when the type is not passed', () => {
  const component = shallow(<FieldNameWithIcon name="agent.name" />);
  expect(component).toMatchSnapshot();
});
