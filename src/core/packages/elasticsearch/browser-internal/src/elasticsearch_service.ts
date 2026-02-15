/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreService } from '@kbn/core-base-browser-internal';
import type {
  ElasticsearchServiceSetup,
  ElasticsearchServiceStart,
} from '@kbn/core-elasticsearch-browser';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';

interface SetupDeps {
  injectedMetadata: InternalInjectedMetadataSetup;
}

/**
 * Browser-side service that exposes Elasticsearch values from injected metadata.
 * @internal
 */
export class ElasticsearchService implements CoreService<{}, ElasticsearchServiceStart> {
  private contract?: ElasticsearchServiceSetup;

  public setup({ injectedMetadata }: SetupDeps): ElasticsearchServiceSetup {
    this.contract = {
      getCpsEnabled: () => injectedMetadata.getCpsEnabled(),
    };
    return this.contract;
  }

  public start(): ElasticsearchServiceStart {
    return this.contract!;
  }

  public stop() {}
}
