/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { executionContextServiceMock } from '@kbn/core-execution-context-browser-mocks';
import { fatalErrorsServiceMock } from '@kbn/core-fatal-errors-browser-mocks';
import { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
import { HttpService } from '@kbn/core-http-browser-internal';

export type SetupTap = (
  injectedMetadata: ReturnType<typeof injectedMetadataServiceMock.createSetupContract>,
  fatalErrors: ReturnType<typeof fatalErrorsServiceMock.createSetupContract>
) => void;

const defaultTap: SetupTap = (
  injectedMetadata: ReturnType<typeof injectedMetadataServiceMock.createSetupContract>
) => {
  injectedMetadata.getBasePath.mockReturnValue('http://localhost/myBase');
};

export function setup(tap: SetupTap = defaultTap) {
  const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
  const fatalErrors = fatalErrorsServiceMock.createSetupContract();

  tap(injectedMetadata, fatalErrors);

  const httpService = new HttpService();
  const executionContext = executionContextServiceMock.createSetupContract();
  const http = httpService.setup({ fatalErrors, injectedMetadata, executionContext });

  return { httpService, injectedMetadata, fatalErrors, http };
}
