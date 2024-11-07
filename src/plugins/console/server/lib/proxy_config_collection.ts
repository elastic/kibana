/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Agent } from 'http';
import { defaultsDeep } from 'lodash';
import { parse as parseUrl } from 'url';

import { ProxyConfig } from './proxy_config';

export class ProxyConfigCollection {
  private configs: ProxyConfig[];

  constructor(
    configs: Array<{
      match: { protocol: string; host: string; port: string; path: string };
      timeout: number;
    }> = []
  ) {
    this.configs = configs.map((settings) => new ProxyConfig(settings));
  }

  hasConfig() {
    return Boolean(this.configs.length);
  }

  configForUri(uri: string): { agent: Agent; timeout: number } {
    const parsedUri = parseUrl(uri);
    const settings = this.configs.map((config) => config.getForParsedUri(parsedUri as any));
    return defaultsDeep({}, ...settings);
  }
}
