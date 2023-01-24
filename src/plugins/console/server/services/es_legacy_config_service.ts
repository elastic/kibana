/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, Observable, Subscription } from 'rxjs';
import { ElasticsearchConfig } from '@kbn/core/server';

export class EsLegacyConfigService {
  /**
   * The elasticsearch config value at a given point in time.
   */
  private config?: ElasticsearchConfig;

  /**
   * An observable that emits elasticsearch config.
   */
  private config$?: Observable<ElasticsearchConfig>;

  /**
   * A reference to the subscription to the elasticsearch observable
   */
  private configSub?: Subscription;

  setup(config$: Observable<ElasticsearchConfig>) {
    this.config$ = config$;
    this.configSub = this.config$.subscribe((config) => {
      this.config = config;
    });
  }

  stop() {
    if (this.configSub) {
      this.configSub.unsubscribe();
    }
  }

  async readConfig(): Promise<ElasticsearchConfig> {
    if (!this.config$) {
      throw new Error('Could not read elasticsearch config, this service has not been setup!');
    }

    if (!this.config) {
      return firstValueFrom(this.config$);
    }

    return this.config;
  }
}
