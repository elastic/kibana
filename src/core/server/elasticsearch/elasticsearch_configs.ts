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

import { Env } from '../config';
import { ElasticsearchClusterType, ElasticsearchConfig } from './elasticsearch_config';
import { ElasticsearchConfigsSchema, elasticsearchSchema } from './schema';

export class ElasticsearchConfigs {
  /**
   * @internal
   */
  public static schema = elasticsearchSchema;

  private readonly configs: { [type in ElasticsearchClusterType]: ElasticsearchConfig };

  /**
   * @internal
   */
  constructor(config: ElasticsearchConfigsSchema, env: Env) {
    this.configs = {
      admin: new ElasticsearchConfig('admin', config),
      data:
        config.tribe !== undefined
          ? new ElasticsearchConfig('data', config.tribe)
          : new ElasticsearchConfig('data', config),
    };
  }

  public forType(type: ElasticsearchClusterType) {
    return this.configs[type];
  }
}
