/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { findTestSubject } from '@kbn/test-jest-helpers';
import { mount } from 'enzyme';
import React, { ReactNode } from 'react';
import { discoverServiceMock } from '../../__mocks__/services';
import { ErrorCallout } from './error_callout';

const mockGetSearchErrorOverrideDisplay = jest.fn();

jest.mock('@kbn/data-plugin/public', () => {
  const originalModule = jest.requireActual('@kbn/data-plugin/public');
  return {
    ...originalModule,
    getSearchErrorOverrideDisplay: () => mockGetSearchErrorOverrideDisplay(),
  };
});

describe('ErrorCallout', () => {
  const mountWithServices = (component: ReactNode) =>
    mount(
      <KibanaContextProvider services={discoverServiceMock}>{component}</KibanaContextProvider>
    );

  afterEach(() => {
    mockGetSearchErrorOverrideDisplay.mockReset();
  });

  it('should render', () => {
    const title = 'Error title';
    const error = new Error('My error');
    const wrapper = mountWithServices(<ErrorCallout title={title} error={error} />);
    const prompt = wrapper.find(EuiEmptyPrompt);
    expect(prompt).toHaveLength(1);
    expect(prompt.prop('title')).toBeDefined();
    expect(prompt.prop('title')).not.toBeInstanceOf(String);
    expect(prompt.prop('body')).toBeDefined();
    expect(findTestSubject(prompt, 'discoverErrorCalloutTitle').contains(title)).toBe(true);
    expect(findTestSubject(prompt, 'discoverErrorCalloutMessage').contains(error.message)).toBe(
      true
    );
    expect(prompt.find(EuiButton)).toHaveLength(1);
  });

  it('should render with override display', () => {
    const title = 'Override title';
    const error = new Error('My error');
    const overrideDisplay = <div>Override display</div>;
    mockGetSearchErrorOverrideDisplay.mockReturnValue({ title, body: overrideDisplay });
    const wrapper = mountWithServices(<ErrorCallout title="Original title" error={error} />);
    const prompt = wrapper.find(EuiEmptyPrompt);
    expect(prompt).toHaveLength(1);
    expect(prompt.prop('title')).toBeDefined();
    expect(prompt.prop('title')).not.toBeInstanceOf(String);
    expect(prompt.prop('body')).toBeDefined();
    expect(findTestSubject(prompt, 'discoverErrorCalloutTitle').contains(title)).toBe(true);
    expect(prompt.contains(overrideDisplay)).toBe(true);
    expect(prompt.find(EuiButton)).toHaveLength(0);
  });

  it('should call showErrorDialog when the button is clicked', () => {
    (discoverServiceMock.core.notifications.showErrorDialog as jest.Mock).mockClear();
    const title = 'Error title';
    const error = new Error('My error');
    const wrapper = mountWithServices(<ErrorCallout title={title} error={error} />);
    wrapper.find(EuiButton).find('button').simulate('click');
    expect(discoverServiceMock.core.notifications.showErrorDialog).toHaveBeenCalledWith({
      title,
      error,
    });
  });
});
