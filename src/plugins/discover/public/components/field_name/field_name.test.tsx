/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from 'enzyme';
import { FieldName } from './field_name';

// Note that it currently provides just 2 basic tests, there should be more, but
// the components involved will soon change
test('FieldName renders a string field by providing fieldType and fieldName', () => {
  const component = render(<FieldName fieldType="string" fieldName="test" />);
  expect(component).toMatchSnapshot();
});

test('FieldName renders a number field by providing a field record', () => {
  const component = render(<FieldName fieldName={'test.test.test'} fieldType={'number'} />);
  expect(component).toMatchSnapshot();
});

test('FieldName renders a geo field', () => {
  const component = render(<FieldName fieldName={'test.test.test'} fieldType={'geo_point'} />);
  expect(component).toMatchSnapshot();
});

test('FieldName renders unknown field', () => {
  const component = render(<FieldName fieldName={'test.test.test'} />);
  expect(component).toMatchSnapshot();
});
