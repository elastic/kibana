/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { URL, format } from 'node:url';
import type { CspAdditionalConfig } from './csp';

interface PackageInfo {
  packageInfo: { buildSha: string };
}
export interface Input {
  url?: string;
  suffixSHADigestToPath: boolean;
}

/**
 * Assumes no leading/trailing whitespace
 */
function isEmptyPathName(url: URL): boolean {
  return !url.pathname || url.pathname === '/';
}

export class CdnConfig {
  private url: undefined | URL;
  constructor(
    url: undefined | string,
    private readonly suffixSHADigest: boolean,
    { packageInfo }: PackageInfo
  ) {
    if (url) {
      this.url = new URL(url); // This will throw for invalid URLs
      this.url.pathname = this.url.pathname.trim();
      if (this.suffixSHADigest) {
        const digest = packageInfo.buildSha.trim().slice(0, 12);
        this.url.pathname = isEmptyPathName(this.url)
          ? `/${digest}`
          : `${this.url.pathname}/${digest}`;
      }
    }
  }

  public get host(): undefined | string {
    return this.url?.host ?? undefined;
  }

  private _baseHref: undefined | string;
  public get baseHref(): undefined | string {
    if (this._baseHref != null) return this._baseHref;
    if (this.url) {
      this._baseHref = isEmptyPathName(this.url) ? this.url.origin : format(this.url);
    }
    return this._baseHref;
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

  public static from(input: Input, pkgInfo: PackageInfo) {
    return new CdnConfig(input.url, input.suffixSHADigestToPath, pkgInfo);
  }
}
