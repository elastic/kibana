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

import { shallow } from 'enzyme';
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { ErrorToast } from './error_toast';

import { i18nServiceMock } from '../../i18n/i18n_service.mock';

interface ErrorToastProps {
  error?: Error;
  title?: string;
  toastMessage?: string;
}

function render(props: ErrorToastProps = {}) {
  return (
    <ErrorToast
      error={props.error || new Error('error message')}
      title={props.title || 'An error occured'}
      toastMessage={props.toastMessage || 'This is the toast message'}
      i18nContext={i18nServiceMock.createSetupContract().Context}
    />
  );
}

it('renders matching snapshot', () => {
  expect(shallow(render())).toMatchSnapshot();
});

it('should open a modal when clicking button', () => {
  const wrapper = mountWithIntl(render());
  expect(document.body.querySelector('[data-test-subj="fullErrorModal"]')).toBeFalsy();
  wrapper.find('button').simulate('click');
  expect(document.body.querySelector('[data-test-subj="fullErrorModal"]')).toBeTruthy();
});
