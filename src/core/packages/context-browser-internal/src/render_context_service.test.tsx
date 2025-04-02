/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';

import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';

import { RenderContextService } from './render_context_service';

jest.mock('@elastic/eui', () => ({
  EuiLoadingSpinner: jest.fn(() => <div>Loading...</div>),
}));

jest.mock('@kbn/react-kibana-context-render', () => ({
  KibanaRenderContextProvider: jest.fn(({ children }) => (
    <div data-test-subj="kibana-render-context">{children}</div>
  )),
}));

describe('RenderContextService', () => {
  it('renders loading spinner when dependencies are null', () => {
    const service = new RenderContextService();
    const TestComponent = service.addContext(<div>Test Element</div>);

    const { getByText } = render(TestComponent);
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('renders the React element when dependencies are provideed', () => {
    const service = new RenderContextService();
    const deps = {
      analytics: analyticsServiceMock.createAnalyticsServiceStart(),
      executionContext: executionContextServiceMock.createStartContract(),
      i18n: i18nServiceMock.createStartContract(),
      theme: themeServiceMock.createStartContract(),
      userProfile: userProfileServiceMock.createStart(),
    };
    service.start(deps);

    const TestComponent = service.addContext(<div>Test Element</div>);

    const { getByTestId, getByText } = render(TestComponent);
    expect(getByTestId('kibana-render-context')).toBeTruthy();
    expect(getByText('Test Element')).toBeTruthy();
  });
});
