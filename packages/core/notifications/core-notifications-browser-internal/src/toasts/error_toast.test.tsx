/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { shallow } from 'enzyme';
import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { ErrorToast } from './error_toast';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';

interface ErrorToastProps {
  error?: Error;
  title?: string;
  toastMessage?: string;
}

let openModal: jest.Mock;
const mockAnalytics = analyticsServiceMock.createAnalyticsServiceStart();
const mockTheme = themeServiceMock.createStartContract();
const mockI18n = i18nServiceMock.createStartContract();

beforeEach(() => (openModal = jest.fn()));

function render(props: ErrorToastProps = {}) {
  return (
    <ErrorToast
      openModal={openModal}
      error={props.error || new Error('error message')}
      title={props.title || 'An error occured'}
      toastMessage={props.toastMessage || 'This is the toast message'}
      analytics={mockAnalytics}
      i18n={mockI18n}
      theme={mockTheme}
    />
  );
}

it('renders matching snapshot', () => {
  expect(shallow(render())).toMatchSnapshot();
});

it('should open a modal when clicking button', () => {
  const wrapper = mountWithIntl(render());
  expect(openModal).not.toHaveBeenCalled();
  wrapper.find('button').simulate('click');
  expect(openModal).toHaveBeenCalled();
});

afterAll(() => {
  // Cleanup document.body to cleanup any modals which might be left over from tests.
  document.body.innerHTML = '';
});
