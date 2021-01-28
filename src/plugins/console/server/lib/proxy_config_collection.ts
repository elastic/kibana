/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
