/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { URL, format } from 'node:url';
import type { CspAdditionalConfig } from './csp';

export interface Input {
  url?: string;
}

export class CdnConfig {
  private readonly url: undefined | URL;
  constructor(url?: string) {
    if (url) {
      this.url = new URL(url); // This will throw for invalid URLs, although should be validated before reaching this point
    }
  }

  public get host(): undefined | string {
    return this.url?.host;
  }

  public get baseHref(): undefined | string {
    if (this.url) {
      return this.url.pathname === '/' ? this.url.origin : format(this.url);
    }
  }

  public getCspConfig(): CspAdditionalConfig {
    const host = this.host;
    if (!host) return {};
    return {
      font_src: [host],
      img_src: [host],
      script_src: [host],
      style_src: [host],
      worker_src: [host],
      connect_src: [host],
    };
  }

  public static from(input: Input = {}) {
    return new CdnConfig(input.url);
  }
}
