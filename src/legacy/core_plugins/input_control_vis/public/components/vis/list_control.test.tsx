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
import sinon from 'sinon';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { ListControl } from './list_control';

const options = ['choice1', 'choice2'];

const formatOptionLabel = (value: any) => {
  return `${value} + formatting`;
};

let stageFilter: sinon.SinonSpy;

beforeEach(() => {
  stageFilter = sinon.spy();
});

test('renders ListControl', () => {
  const component = shallowWithIntl(
    <ListControl.WrappedComponent
      id="mock-list-control"
      label="list control"
      options={options}
      selectedOptions={[]}
      multiselect={true}
      controlIndex={0}
      stageFilter={stageFilter}
      formatOptionLabel={formatOptionLabel}
      intl={{} as any}
    />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('disableMsg', () => {
  const component = shallowWithIntl(
    <ListControl.WrappedComponent
      id="mock-list-control"
      label="list control"
      selectedOptions={[]}
      multiselect={true}
      controlIndex={0}
      stageFilter={stageFilter}
      formatOptionLabel={formatOptionLabel}
      disableMsg={'control is disabled to test rendering when disabled'}
      intl={{} as any}
    />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});
