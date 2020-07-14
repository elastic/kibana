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

import { defaultsDeep } from 'lodash';
import { parse as parseUrl } from 'url';

import { ProxyConfig } from './proxy_config';

export class ProxyConfigCollection {
  private configs: ProxyConfig[];

  constructor(configs: Array<{ match: any; timeout: number }> = []) {
    this.configs = configs.map((settings) => new ProxyConfig(settings));
  }

  hasConfig() {
    return Boolean(this.configs.length);
  }

  configForUri(uri: string): object {
    const parsedUri = parseUrl(uri);
    const settings = this.configs.map((config) => config.getForParsedUri(parsedUri as any));
    return defaultsDeep({}, ...settings);
  }
}
