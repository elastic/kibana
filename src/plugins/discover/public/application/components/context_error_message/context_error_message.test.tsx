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
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ReactWrapper } from 'enzyme';
import { ContextErrorMessage } from './context_error_message';
// @ts-ignore
import { FAILURE_REASONS, LOADING_STATUS } from '../../angular/context/query';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';

describe('loading spinner', function () {
  let component: ReactWrapper;

  it('ContextErrorMessage does not render on loading', () => {
    component = mountWithIntl(<ContextErrorMessage status={LOADING_STATUS.LOADING} />);
    expect(findTestSubject(component, 'contextErrorMessageTitle').length).toBe(0);
  });

  it('ContextErrorMessage does not render on success loading', () => {
    component = mountWithIntl(<ContextErrorMessage status={LOADING_STATUS.LOADED} />);
    expect(findTestSubject(component, 'contextErrorMessageTitle').length).toBe(0);
  });

  it('ContextErrorMessage renders just the title if the reason is not specifically handled', () => {
    component = mountWithIntl(<ContextErrorMessage status={LOADING_STATUS.FAILED} />);
    expect(findTestSubject(component, 'contextErrorMessageTitle').length).toBe(1);
    expect(findTestSubject(component, 'contextErrorMessageBody').text()).toBe('');
  });

  it('ContextErrorMessage renders the reason for unknown errors', () => {
    component = mountWithIntl(
      <ContextErrorMessage status={LOADING_STATUS.FAILED} reason={FAILURE_REASONS.UNKNOWN} />
    );
    expect(findTestSubject(component, 'contextErrorMessageTitle').length).toBe(1);
    expect(findTestSubject(component, 'contextErrorMessageBody').length).toBe(1);
  });
});
