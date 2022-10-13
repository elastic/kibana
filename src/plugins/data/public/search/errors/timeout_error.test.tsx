/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchTimeoutError, TimeoutErrorMode } from './timeout_error';

import { coreMock } from '@kbn/core/public/mocks';
const startMock = coreMock.createStart();

import { mount } from 'enzyme';
import { AbortError } from '@kbn/kibana-utils-plugin/public';

describe('SearchTimeoutError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    startMock.application.navigateToApp.mockImplementation(jest.fn());
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
