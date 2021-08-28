/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreService } from '../../types/core_service';
import type { FatalErrorsSetup } from '../fatal_errors/fatal_errors_service';
import type { InjectedMetadataSetup } from '../injected_metadata/injected_metadata_service';
import { AnonymousPathsService } from './anonymous_paths_service';
import { BasePath } from './base_path';
import { ExternalUrlService } from './external_url_service';
import { Fetch } from './fetch';
import { LoadingCountService } from './loading_count_service';
import type { HttpSetup, HttpStart } from './types';

interface HttpDeps {
  injectedMetadata: InjectedMetadataSetup;
  fatalErrors: FatalErrorsSetup;
}

/** @internal */
export class HttpService implements CoreService<HttpSetup, HttpStart> {
  private readonly anonymousPaths = new AnonymousPathsService();
  private readonly loadingCount = new LoadingCountService();
  private service?: HttpSetup;

  public setup({ injectedMetadata, fatalErrors }: HttpDeps): HttpSetup {
    const kibanaVersion = injectedMetadata.getKibanaVersion();
    const basePath = new BasePath(
      injectedMetadata.getBasePath(),
      injectedMetadata.getServerBasePath(),
      injectedMetadata.getPublicBaseUrl()
    );
    const fetchService = new Fetch({ basePath, kibanaVersion });
    const loadingCount = this.loadingCount.setup({ fatalErrors });
    loadingCount.addLoadingCountSource(fetchService.getRequestCount$());

    this.service = {
      basePath,
      anonymousPaths: this.anonymousPaths.setup({ basePath }),
      externalUrl: new ExternalUrlService().setup({ injectedMetadata, location: window.location }),
      intercept: fetchService.intercept.bind(fetchService),
      fetch: fetchService.fetch.bind(fetchService),
      delete: fetchService.delete.bind(fetchService),
      get: fetchService.get.bind(fetchService),
      head: fetchService.head.bind(fetchService),
      options: fetchService.options.bind(fetchService),
      patch: fetchService.patch.bind(fetchService),
      post: fetchService.post.bind(fetchService),
      put: fetchService.put.bind(fetchService),
      ...loadingCount,
    };

    return this.service;
  }

  public start() {
    if (!this.service) {
      throw new Error(`HttpService#setup() must be called first!`);
    }

    return this.service;
  }

  public stop() {
    this.loadingCount.stop();
  }
}
