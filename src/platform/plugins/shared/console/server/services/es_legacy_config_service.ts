/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable, Subscription } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import type { IElasticsearchConfig } from '@kbn/core-elasticsearch-server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';

export class EsLegacyConfigService {
  /**
   * The elasticsearch config value at a given point in time.
   */
  private config?: IElasticsearchConfig;

  /**
   * An observable that emits elasticsearch config.
   */
  private config$?: Observable<IElasticsearchConfig>;

  /**
   * A reference to the subscription to the elasticsearch observable
   */
  private configSub?: Subscription;

  /**
   * URL to cloud instance of elasticsearch if available
   */
  private cloudUrl?: string;

  setup(config$: Observable<IElasticsearchConfig>, cloud?: CloudSetup) {
    this.config$ = config$;
    this.configSub = this.config$.subscribe((config) => {
      this.config = config;
    });
    this.cloudUrl = cloud?.elasticsearchUrl;
  }

  stop() {
    if (this.configSub) {
      this.configSub.unsubscribe();
    }
  }

  async readConfig(): Promise<IElasticsearchConfig> {
    if (!this.config$) {
      throw new Error('Could not read elasticsearch config, this service has not been setup!');
    }

    if (!this.config) {
      return firstValueFrom(this.config$);
    }

    return this.config;
  }

  getCloudUrl(): string | undefined {
    return this.cloudUrl;
  }
}
