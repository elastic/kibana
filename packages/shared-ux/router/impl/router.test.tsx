/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { RouterProvider } from './services';
import { KibanaSharedUXRouterProviderDeps } from '@kbn/shared-ux-router-types';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';

describe('<RouterProvider', () => {
  let mockContext$: KibanaSharedUXRouterProviderDeps['context$'];

  beforeEach(() => {
    mockContext$ = executionContextServiceMock;
  });

  it('should render', async () => {
    const { findByTestId } = render(
      <RouterProvider context$={mockContext$} set={jest.fn()} get={jest.fn()} clear={jest.fn()} />
    );
    expect(findByTestId('router-shared-ux')).toBeTruthy();
  });
});
