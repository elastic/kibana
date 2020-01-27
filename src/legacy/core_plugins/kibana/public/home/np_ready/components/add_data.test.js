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
import { AddData } from './add_data';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { getServices } from '../../kibana_services';

jest.mock('../../kibana_services', () => {
  const mock = {
    getBasePath: jest.fn(() => 'path'),
  };
  return {
    getServices: () => mock,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

test('render', () => {
  const component = shallowWithIntl(
    <AddData.WrappedComponent apmUiEnabled={false} mlEnabled={false} isNewKibanaInstance={false} />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
  expect(getServices().getBasePath).toHaveBeenCalledTimes(1);
});

test('mlEnabled', () => {
  const component = shallowWithIntl(
    <AddData.WrappedComponent apmUiEnabled={true} mlEnabled={true} isNewKibanaInstance={false} />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
  expect(getServices().getBasePath).toHaveBeenCalledTimes(1);
});

test('apmUiEnabled', () => {
  const component = shallowWithIntl(
    <AddData.WrappedComponent apmUiEnabled={true} mlEnabled={false} isNewKibanaInstance={false} />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
  expect(getServices().getBasePath).toHaveBeenCalledTimes(1);
});

test('isNewKibanaInstance', () => {
  const component = shallowWithIntl(
    <AddData.WrappedComponent apmUiEnabled={false} mlEnabled={false} isNewKibanaInstance={true} />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
  expect(getServices().getBasePath).toHaveBeenCalledTimes(1);
});
