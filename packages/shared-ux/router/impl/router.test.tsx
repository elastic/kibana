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
  let http: KibanaSharedUXRouterProviderDeps['http'];
  beforeEach(() => {
    http = executionContextServiceMock.createInternalSetupContract();
  });

  it('should change pageName on new page', async () => {
    const component = render(<RouterProvider http={http} />);
  });
});
