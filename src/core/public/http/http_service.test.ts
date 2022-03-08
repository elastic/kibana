/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-expect-error
import fetchMock from 'fetch-mock/es5/client';
import { loadingServiceMock } from './http_service.test.mocks';

import { fatalErrorsServiceMock } from '../fatal_errors/fatal_errors_service.mock';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { HttpService } from './http_service';
import { Observable } from 'rxjs';
import { executionContextServiceMock } from '../execution_context/execution_context_service.mock';

describe('interceptors', () => {
  afterEach(() => fetchMock.restore());

  it('shares interceptors across setup and start', async () => {
    fetchMock.get('*', {});
    const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
    const fatalErrors = fatalErrorsServiceMock.createSetupContract();
    const executionContext = executionContextServiceMock.createSetupContract();
    const httpService = new HttpService();

    const setup = httpService.setup({ fatalErrors, injectedMetadata, executionContext });
    const setupInterceptor = jest.fn();
    setup.intercept({ request: setupInterceptor });

    const start = httpService.start();
    const startInterceptor = jest.fn();
    start.intercept({ request: startInterceptor });

    await setup.get('/blah');
    expect(setupInterceptor).toHaveBeenCalledTimes(1);
    expect(startInterceptor).toHaveBeenCalledTimes(1);

    await start.get('/other-blah');
    expect(setupInterceptor).toHaveBeenCalledTimes(2);
    expect(startInterceptor).toHaveBeenCalledTimes(2);
  });
});

describe('#setup()', () => {
  it('registers Fetch#getLoadingCount$() with LoadingCountSetup#addLoadingCountSource()', () => {
    const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
    const fatalErrors = fatalErrorsServiceMock.createSetupContract();
    const httpService = new HttpService();
    const executionContext = executionContextServiceMock.createSetupContract();
    httpService.setup({ fatalErrors, injectedMetadata, executionContext });
    const loadingServiceSetup = loadingServiceMock.setup.mock.results[0].value;
    // We don't verify that this Observable comes from Fetch#getLoadingCount$() to avoid complex mocking
    expect(loadingServiceSetup.addLoadingCountSource).toHaveBeenCalledWith(expect.any(Observable));
  });
});

describe('#stop()', () => {
  it('calls loadingCount.stop()', () => {
    const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
    const fatalErrors = fatalErrorsServiceMock.createSetupContract();
    const httpService = new HttpService();
    const executionContext = executionContextServiceMock.createSetupContract();
    httpService.setup({ fatalErrors, injectedMetadata, executionContext });
    httpService.start();
    httpService.stop();
    expect(loadingServiceMock.stop).toHaveBeenCalled();
  });
});
