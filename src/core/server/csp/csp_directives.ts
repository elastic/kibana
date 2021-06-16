/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CspConfigType } from './config';

export type CspDirectiveName = 'script-src' | 'worker-src' | 'style-src' | 'frame-ancestors';

export const defaultRules: Partial<Record<CspDirectiveName, string[]>> = {
  'script-src': [`'unsafe-eval'`, `'self'`],
  'worker-src': [`blob:`, `'self'`],
  'style-src': [`'unsafe-inline'`, `'self'`],
};

export class CspDirectives {
  private readonly directives = new Map<CspDirectiveName, Set<string>>();

  addDirectiveValue(directiveName: CspDirectiveName, directiveValue: string) {
    if (!this.directives.has(directiveName)) {
      this.directives.set(directiveName, new Set());
    }
    this.directives.get(directiveName)!.add(normalizeDirectiveValue(directiveValue));
  }

  getCspHeader() {
    return this.getRules().join('; ');
  }

  getRules() {
    return [...this.directives.entries()].map(([name, values]) => {
      return [name, ...values].join(' ');
    });
  }

  static fromConfig(config: CspConfigType): CspDirectives {
    const cspDirectives = new CspDirectives();
    const initialRules = config.rules ? parseRules(config.rules) : { ...defaultRules };
    Object.entries(initialRules).forEach(([key, values]) => {
      values?.forEach((value) => {
        cspDirectives.addDirectiveValue(key as CspDirectiveName, value);
      });
    });
    config.script_src.forEach((scriptSrc) => {
      cspDirectives.addDirectiveValue('script-src', scriptSrc);
    });
    config.worker_src.forEach((workerSrc) => {
      cspDirectives.addDirectiveValue('worker-src', workerSrc);
    });
    config.style_src.forEach((styleSrc) => {
      cspDirectives.addDirectiveValue('style-src', styleSrc);
    });
    return cspDirectives;
  }
}

const parseRules = (rules: string[]): Partial<Record<CspDirectiveName, string[]>> => {
  const directives: Partial<Record<CspDirectiveName, string[]>> = {};
  rules.forEach((rule) => {
    const [name, ...values] = rule.replace(/\s+/g, ' ').trim().split(' ');
    directives[name as CspDirectiveName] = values;
  });
  return directives;
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
