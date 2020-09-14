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

import { Observable, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { ElasticsearchConfig } from 'kibana/server';

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
      return this.config$.pipe(first()).toPromise();
    }

    return this.config;
  }
}
