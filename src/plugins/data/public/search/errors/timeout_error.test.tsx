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

import { SearchTimeoutError, TimeoutErrorMode } from './timeout_error';

import { coreMock } from '../../../../../core/public/mocks';
const startMock = coreMock.createStart();

import { mount } from 'enzyme';
import { AbortError } from '../../../../kibana_utils/public';

describe('SearchTimeoutError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    startMock.application.navigateToApp.mockImplementation(jest.fn());
  });

  it('Should navigate to upgrade', () => {
    const e = new SearchTimeoutError(new AbortError(), TimeoutErrorMode.UPGRADE);
    const component = mount(e.getErrorMessage(startMock.application));

    expect(component.find('EuiButton').length).toBe(1);
    component.find('EuiButton').simulate('click');
    expect(startMock.application.navigateToUrl).toHaveBeenCalledWith(
      'https://www.elastic.co/subscriptions'
    );
  });

  it('Should create contact admin message', () => {
    const e = new SearchTimeoutError(new AbortError(), TimeoutErrorMode.CONTACT);
    const component = mount(e.getErrorMessage(startMock.application));

    expect(component.find('EuiButton').length).toBe(0);
  });

  it('Should navigate to settings', () => {
    const e = new SearchTimeoutError(new AbortError(), TimeoutErrorMode.CHANGE);
    const component = mount(e.getErrorMessage(startMock.application));

    expect(component.find('EuiButton').length).toBe(1);
    component.find('EuiButton').simulate('click');
    expect(startMock.application.navigateToApp).toHaveBeenCalledWith('management', {
      path: '/kibana/settings',
    });
  });
});
