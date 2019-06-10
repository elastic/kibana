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
import { mount, render } from 'enzyme';

import { findTestSubject, requiredProps } from '../../test';
import { keyCodes } from '../../services';

import {
  CANCEL_BUTTON, CONFIRM_BUTTON, KuiConfirmModal,
} from './confirm_modal';

let onConfirm;
let onCancel;

beforeEach(() => {
  onConfirm = sinon.spy();
  onCancel = sinon.spy();
});

test('renders KuiConfirmModal', () => {
  const component = render(
    <KuiConfirmModal
      title="A confirmation modal"
      onCancel={() => {}}
      onConfirm={onConfirm}
      cancelButtonText="Cancel Button Text"
      confirmButtonText="Confirm Button Text"
      {...requiredProps}
    >
      This is a confirmation modal example
    </KuiConfirmModal>
  );
  expect(component).toMatchSnapshot();
});

test('onConfirm', () => {
  const component = mount(
    <KuiConfirmModal
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText="Cancel Button Text"
      confirmButtonText="Confirm Button Text"
    />
  );

  findTestSubject(component, 'confirmModalConfirmButton').simulate('click');
  sinon.assert.calledOnce(onConfirm);
  sinon.assert.notCalled(onCancel);
});

describe('onCancel', () => {
  test('triggered by click', () => {
    const component = mount(
      <KuiConfirmModal
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText="Cancel Button Text"
        confirmButtonText="Confirm Button Text"
      />
    );

    findTestSubject(component, 'confirmModalCancelButton').simulate('click');
    sinon.assert.notCalled(onConfirm);
    sinon.assert.calledOnce(onCancel);
  });

  test('triggered by esc key', () => {
    const component = mount(
      <KuiConfirmModal
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText="Cancel Button Text"
        confirmButtonText="Confirm Button Text"
        data-test-subj="modal"
      />
    );

    findTestSubject(component, 'modal').simulate('keydown', { keyCode: keyCodes.ESCAPE });
    sinon.assert.notCalled(onConfirm);
    sinon.assert.calledOnce(onCancel);
  });
});

describe('defaultFocusedButton', () => {
  test('is cancel', () => {
    const component = mount(
      <KuiConfirmModal
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText="Cancel Button Text"
        confirmButtonText="Confirm Button Text"
        defaultFocusedButton={CANCEL_BUTTON}
      />
    );

    const button = findTestSubject(component, 'confirmModalCancelButton').getDOMNode();
    expect(document.activeElement).toEqual(button);
  });

  test('is confirm', () => {
    const component = mount(
      <KuiConfirmModal
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText="Cancel Button Text"
        confirmButtonText="Confirm Button Text"
        defaultFocusedButton={CONFIRM_BUTTON}
      />
    );

    const button = findTestSubject(component, 'confirmModalConfirmButton').getDOMNode();
    expect(document.activeElement).toEqual(button);
  });

  test('when not given gives focus to the modal', () => {
    const component = mount(
      <KuiConfirmModal
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText="Cancel Button Text"
        confirmButtonText="Confirm Button Text"
      />
    );
    expect(document.activeElement).toEqual(component.getDOMNode().firstChild);
  });
});
