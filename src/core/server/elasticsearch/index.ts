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

import { Observable } from 'rxjs';

import { Router } from '../http';
import { LoggerFactory } from '../logging';
import { registerElasticsearchRoutes } from './api';
import { ElasticsearchConfigs } from './elasticsearch_configs';
import { ElasticsearchService } from './elasticsearch_service';

export { ElasticsearchClusterType } from './elasticsearch_config';
export { AdminClient } from './admin_client';
export { ScopedDataClient } from './scoped_data_client';
export { ElasticsearchService, ElasticsearchConfigs };

export class ElasticsearchModule {
  public readonly service: ElasticsearchService;

  constructor(
    readonly config$: Observable<ElasticsearchConfigs>,
    private readonly logger: LoggerFactory
  ) {
    this.service = new ElasticsearchService(this.config$, logger);
  }

  public createRoutes() {
    const router = new Router('/elasticsearch');

    return registerElasticsearchRoutes(router, this.logger, this.service);
  }
}
