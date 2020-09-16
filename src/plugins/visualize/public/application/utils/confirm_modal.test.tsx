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
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { ConfirmModal, ConfirmModalProps } from './confirm_modal';
import { findTestSubject } from '@elastic/eui/lib/test/find_test_subject';

describe('Confirm Modal', () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  const defaultProps = {
    onConfirm,
    onCancel,
    title: 'Hello World',
  };

  function mountComponent(props?: ConfirmModalProps) {
    const compProps = props || defaultProps;
    return mountWithIntl(<ConfirmModal {...compProps} />);
  }

  test('renders modal', () => {
    const component = mountComponent();
    const title = findTestSubject(component, 'confirmModalTitleText');
    expect(title.getDOMNode().innerHTML).toBe('Hello World');
    const confirmButton = findTestSubject(component, 'confirmModalConfirmButton');
    confirmButton.simulate('click');
    expect(onConfirm).toHaveBeenCalled();
    const cancelButton = findTestSubject(component, 'confirmModalCancelButton');
    cancelButton.simulate('click');
    expect(onCancel).toHaveBeenCalled();
  });

  test('renders modal with description text', () => {
    const props = { ...defaultProps, description: 'Are you sure?' };
    const component = mountComponent(props);
    const confirmText = findTestSubject(component, 'confirmModalDescriptionText');
    expect(confirmText.getDOMNode().innerHTML).toBe('Are you sure?');
  });
});
