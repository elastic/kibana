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

// TODO: remove this when EUI supports types for this.
// @ts-ignore: implicit any for JS file
import { takeMountedSnapshot } from '@elastic/eui/lib/test';
import React from 'react';
import { PanelError } from './panel_error';
import { mount } from 'enzyme';

test('PanelError renders plain string', () => {
  const component = mount(<PanelError error="test" />);
  expect(takeMountedSnapshot(component)).toMatchSnapshot();
});

test('PanelError renders string with markdown link', () => {
  const component = mount(<PanelError error="[test](http://www.elastic.co/)" />);
  expect(takeMountedSnapshot(component)).toMatchSnapshot();
});

test('PanelError renders given React Element ', () => {
  const component = mount(<PanelError error={<div>test</div>} />);
  expect(takeMountedSnapshot(component)).toMatchSnapshot();
});
