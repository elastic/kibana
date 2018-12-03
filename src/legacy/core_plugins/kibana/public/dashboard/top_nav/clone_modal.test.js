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
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import {
  findTestSubject,
} from '@elastic/eui/lib/test';

import {
  DashboardCloneModal,
} from './clone_modal';

let onClone;
let onClose;
let component;

beforeEach(() => {
  onClone = sinon.spy();
  onClose = sinon.spy();
});

function createComponent(creationMethod = mountWithIntl) {
  component = creationMethod(
    <DashboardCloneModal.WrappedComponent
      title="dash title"
      onClose={onClose}
      onClone={onClone}
    />
  );
}

test('renders DashboardCloneModal', () => {
  createComponent(shallowWithIntl);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('onClone', () => {
  createComponent();
  findTestSubject(component, 'cloneConfirmButton', false).simulate('click');
  sinon.assert.calledWith(onClone, 'dash title');
  sinon.assert.notCalled(onClose);
});

test('onClose', () => {
  createComponent();
  findTestSubject(component, 'cloneCancelButton', false).simulate('click');
  sinon.assert.calledOnce(onClose);
  sinon.assert.notCalled(onClone);
});

test('title', () => {
  createComponent();
  const event = { target: { value: 'a' } };
  component.find('input').simulate('change', event);
  findTestSubject(component, 'cloneConfirmButton', false).simulate('click');
  sinon.assert.calledWith(onClone, 'a');
});
