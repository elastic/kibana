/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreService } from '@kbn/core-base-browser-internal';
import type { ExecutionContextSetup } from '@kbn/core-execution-context-browser';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { FatalErrorsSetup } from '@kbn/core-fatal-errors-browser';
import type { InternalHttpSetup, InternalHttpStart } from './types';
import { BasePath } from './base_path';
import { StaticAssets } from './static_assets';
import { AnonymousPathsService } from './anonymous_paths_service';
import { LoadingCountService } from './loading_count_service';
import { Fetch } from './fetch';
import { ExternalUrlService } from './external_url_service';

interface HttpDeps {
  injectedMetadata: InternalInjectedMetadataSetup;
  fatalErrors: FatalErrorsSetup;
  executionContext: ExecutionContextSetup;
}

/** @internal */
export class HttpService implements CoreService<InternalHttpSetup, InternalHttpStart> {
  private readonly anonymousPaths = new AnonymousPathsService();
  private readonly loadingCount = new LoadingCountService();
  private service?: InternalHttpSetup;

  public setup({ injectedMetadata, fatalErrors, executionContext }: HttpDeps): InternalHttpSetup {
    const kibanaVersion = injectedMetadata.getKibanaVersion();
    const buildNumber = injectedMetadata.getKibanaBuildNumber();
    const basePath = new BasePath({
      basePath: injectedMetadata.getBasePath(),
      serverBasePath: injectedMetadata.getServerBasePath(),
      publicBaseUrl: injectedMetadata.getPublicBaseUrl(),
      assetsHrefBase: injectedMetadata.getAssetsHrefBase(),
    });
    const staticAssets = new StaticAssets({
      assetsHrefBase: injectedMetadata.getAssetsHrefBase(),
    });

    const fetchService = new Fetch({ basePath, kibanaVersion, buildNumber, executionContext });
    const loadingCount = this.loadingCount.setup({ fatalErrors });
    loadingCount.addLoadingCountSource(fetchService.getRequestCount$());

    this.service = {
      basePath,
      staticAssets,
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
