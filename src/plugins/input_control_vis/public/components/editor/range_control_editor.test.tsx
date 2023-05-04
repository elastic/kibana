/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { SinonSpy, spy, assert } from 'sinon';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { findTestSubject } from '@elastic/eui/lib/test';

import { RangeControlEditor } from './range_control_editor';
import { ControlParams } from '../../editor_utils';
import { getDepsMock } from '../../test_utils/get_deps_mock';
import { getIndexPatternMock, updateComponent } from '../../test_utils';

const controlParams: ControlParams = {
  id: '1',
  indexPattern: 'indexPattern1',
  fieldName: 'numberField',
  label: 'custom label',
  type: 'range',
  options: {
    decimalPlaces: 0,
    step: 1,
  },
  parent: '',
};
const deps = getDepsMock();
let handleFieldNameChange: SinonSpy;
let handleIndexPatternChange: SinonSpy;
let handleOptionsChange: SinonSpy;

beforeEach(() => {
  handleFieldNameChange = spy();
  handleIndexPatternChange = spy();
  handleOptionsChange = spy();
});

test('renders RangeControlEditor', async () => {
  const component = shallow(
    <RangeControlEditor
      deps={deps}
      getIndexPattern={getIndexPatternMock}
      controlIndex={0}
      controlParams={controlParams}
      handleFieldNameChange={handleFieldNameChange}
      handleIndexPatternChange={handleIndexPatternChange}
      handleOptionsChange={handleOptionsChange}
    />
  );

  await updateComponent(component);

  expect(component).toMatchSnapshot();
});

test('handleOptionsChange - step', async () => {
  const component = mountWithIntl(
    <RangeControlEditor
      deps={deps}
      getIndexPattern={getIndexPatternMock}
      controlIndex={0}
      controlParams={controlParams}
      handleFieldNameChange={handleFieldNameChange}
      handleIndexPatternChange={handleIndexPatternChange}
      handleOptionsChange={handleOptionsChange}
    />
  );

  await updateComponent(component);

  findTestSubject(component, 'rangeControlSizeInput0').simulate('change', {
    target: { valueAsNumber: 0.5 },
  });
  assert.notCalled(handleFieldNameChange);
  assert.notCalled(handleIndexPatternChange);
  const expectedControlIndex = 0;
  const expectedOptionName = 'step';
  assert.calledWith(handleOptionsChange, expectedControlIndex, expectedOptionName, 0.5);
});

test('handleOptionsChange - decimalPlaces', async () => {
  const component = mountWithIntl(
    <RangeControlEditor
      deps={deps}
      getIndexPattern={getIndexPatternMock}
      controlIndex={0}
      controlParams={controlParams}
      handleFieldNameChange={handleFieldNameChange}
      handleIndexPatternChange={handleIndexPatternChange}
      handleOptionsChange={handleOptionsChange}
    />
  );

  await updateComponent(component);

  findTestSubject(component, 'rangeControlDecimalPlacesInput0').simulate('change', {
    target: { valueAsNumber: 2 },
  });
  assert.notCalled(handleFieldNameChange);
  assert.notCalled(handleIndexPatternChange);
  const expectedControlIndex = 0;
  const expectedOptionName = 'decimalPlaces';
  assert.calledWith(handleOptionsChange, expectedControlIndex, expectedOptionName, 2);
});
