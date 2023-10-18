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
  private url: undefined | URL;
  constructor(private readonly input: Input) {
    if (this.input.url) {
      this.url = new URL(this.input.url); // This will throw for invalid URLs
    }
  }

  public get hostname(): undefined | string {
    return this.url?.hostname ?? undefined;
  }

  public get baseHref(): undefined | string {
    if (this.url) {
      return this.url.pathname === '/' ? this.url.origin : format(this.url);
    }
  }

  public getCspConfig(): CspAdditionalConfig {
    const hostname = this.hostname;
    if (!hostname) return {};
    return {
      default_src: [hostname],
      font_src: [hostname],
      img_src: [hostname],
      script_src: [hostname],
      style_src: [hostname],
      worker_src: [hostname],
      connect_src: [hostname],
      frame_src: [hostname],
    };
  }

  public static from(input: Input = {}) {
    return new CdnConfig(input);
  }
}
