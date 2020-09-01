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

import { HttpService } from '../../core/public/http';
import { fatalErrorsServiceMock } from '../../core/public/fatal_errors/fatal_errors_service.mock';
import { injectedMetadataServiceMock } from '../../core/public/injected_metadata/injected_metadata_service.mock';

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
