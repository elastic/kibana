/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import sinon from 'sinon';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

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
  expect(component).toMatchSnapshot();
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
  expect(component).toMatchSnapshot();
});
