/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { HttpService } from '../public/http';
import { fatalErrorsServiceMock } from '../public/fatal_errors/fatal_errors_service.mock';
import { injectedMetadataServiceMock } from '../public/injected_metadata/injected_metadata_service.mock';

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
  const http = httpService.setup({ fatalErrors, injectedMetadata });

  return { httpService, injectedMetadata, fatalErrors, http };
}
