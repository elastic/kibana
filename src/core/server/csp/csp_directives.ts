/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CspConfigType } from './config';

export type CspDirectiveName =
  | 'script-src'
  | 'worker-src'
  | 'style-src'
  | 'frame-ancestors'
  | 'connect-src'
  | 'default-src'
  | 'font-src'
  | 'frame-src'
  | 'img-src'
  | 'report-uri'
  | 'report-to';

/**
 * The default directives rules that are always applied
 */
export const defaultRules: Partial<Record<CspDirectiveName, string[]>> = {
  'script-src': [`'unsafe-eval'`, `'self'`],
  'worker-src': [`blob:`, `'self'`],
  'style-src': [`'unsafe-inline'`, `'self'`],
};

/**
 * Per-directive rules that will be added when the configuration contains at least one value
 * Main purpose is to add `self` value to some directives when the configuration specifies other values
 */
export const additionalRules: Partial<Record<CspDirectiveName, string[]>> = {
  'connect-src': [`'self'`],
  'default-src': [`'self'`],
  'font-src': [`'self'`],
  'img-src': [`'self'`],
  'frame-ancestors': [`'self'`],
  'frame-src': [`'self'`],
};

export class CspDirectives {
  private readonly directives = new Map<CspDirectiveName, Set<string>>();

  addDirectiveValue(directiveName: CspDirectiveName, directiveValue: string) {
    if (!this.directives.has(directiveName)) {
      this.directives.set(directiveName, new Set());
    }
    this.directives.get(directiveName)!.add(normalizeDirectiveValue(directiveValue));
  }

  clearDirectiveValues(directiveName: CspDirectiveName) {
    this.directives.delete(directiveName);
  }

  getCspHeader() {
    return [...this.directives.entries()]
      .map(([name, values]) => {
        return [name, ...values].join(' ');
      })
      .join('; ');
  }

  static fromConfig(config: CspConfigType): CspDirectives {
    const cspDirectives = new CspDirectives();

    // combining `default` directive configurations
    Object.entries(defaultRules).forEach(([key, values]) => {
      values?.forEach((value) => {
        cspDirectives.addDirectiveValue(key as CspDirectiveName, value);
      });
    });

    // adding per-directive configuration
    const additiveConfig = parseConfigDirectives(config);
    [...additiveConfig.entries()].forEach(([directiveName, directiveValues]) => {
      const additionalValues = additionalRules[directiveName] ?? [];
      [...additionalValues, ...directiveValues].forEach((value) => {
        cspDirectives.addDirectiveValue(directiveName, value);
      });
    });

    return cspDirectives;
  }
}

const parseConfigDirectives = (cspConfig: CspConfigType): Map<CspDirectiveName, string[]> => {
  const map = new Map<CspDirectiveName, string[]>();

  if (cspConfig.script_src?.length) {
    map.set('script-src', cspConfig.script_src);
  }
  if (cspConfig.worker_src?.length) {
    map.set('worker-src', cspConfig.worker_src);
  }
  if (cspConfig.style_src?.length) {
    map.set('style-src', cspConfig.style_src);
  }
  if (cspConfig.connect_src?.length) {
    map.set('connect-src', cspConfig.connect_src);
  }
  if (cspConfig.default_src?.length) {
    map.set('default-src', cspConfig.default_src);
  }
  if (cspConfig.font_src?.length) {
    map.set('font-src', cspConfig.font_src);
  }
  if (cspConfig.frame_src?.length) {
    map.set('frame-src', cspConfig.frame_src);
  }
  if (cspConfig.img_src?.length) {
    map.set('img-src', cspConfig.img_src);
  }
  if (cspConfig.frame_ancestors?.length) {
    map.set('frame-ancestors', cspConfig.frame_ancestors);
  }
  if (cspConfig.report_uri?.length) {
    map.set('report-uri', cspConfig.report_uri);
  }
  if (cspConfig.report_to?.length) {
    map.set('report-to', cspConfig.report_to);
  }

  return map;
};

const keywordTokens = [
  'none',
  'self',
  'strict-dynamic',
  'report-sample',
  'unsafe-inline',
  'unsafe-eval',
  'unsafe-hashes',
  'unsafe-allow-redirects',
];

function normalizeDirectiveValue(value: string) {
  if (keywordTokens.includes(value)) {
    return `'${value}'`;
  }
  return value;
}
