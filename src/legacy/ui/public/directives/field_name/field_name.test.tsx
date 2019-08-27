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
import { render } from 'enzyme';
import { FieldName } from './field_name';

// Note that it currently provides just 2 basic tests, there should be more, but
// the components involved will soon change
test('FieldName renders a string field by providing fieldType and fieldName', () => {
  const component = render(<FieldName fieldType="string" fieldName="test" />);
  expect(component).toMatchSnapshot();
});

test('FieldName renders a number field by providing a field record, useShortDots is set to false', () => {
  const field = {
    type: 'number',
    name: 'test.test.test',
    rowCount: 100,
    scripted: false,
  };
  const component = render(<FieldName field={field} />);
  expect(component).toMatchSnapshot();
});

test('FieldName renders a geo field, useShortDots is set to true', () => {
  const field = {
    type: 'geo_point',
    name: 'test.test.test',
    rowCount: 0,
    scripted: false,
  };
  const component = render(<FieldName field={field} useShortDots={true} />);
  expect(component).toMatchSnapshot();
});
