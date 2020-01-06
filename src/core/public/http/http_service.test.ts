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

// @ts-ignore
import fetchMock from 'fetch-mock/es5/client';
import { loadingServiceMock } from './http_service.test.mocks';

import { fatalErrorsServiceMock } from '../fatal_errors/fatal_errors_service.mock';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { HttpService } from './http_service';

describe('#stop()', () => {
  it('calls loadingCount.stop()', () => {
    const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
    const fatalErrors = fatalErrorsServiceMock.createSetupContract();
    const httpService = new HttpService();
    httpService.setup({ fatalErrors, injectedMetadata });
    httpService.start({ fatalErrors, injectedMetadata });
    httpService.stop();
    expect(loadingServiceMock.stop).toHaveBeenCalled();
  });
});
