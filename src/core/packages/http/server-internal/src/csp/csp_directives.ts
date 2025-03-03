/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepmerge from 'deepmerge';
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
  | 'report-to'
  | 'form-action'
  | 'object-src';

/**
 * The default report only directives rules
 */
export const defaultReportOnlyRules: Partial<Record<CspDirectiveName, string[]>> = {
  'form-action': [`'report-sample'`, `'self'`],
  'object-src': [`'report-sample'`, `'none'`],
};

/**
 * The default directives rules that are always applied
 */
export const defaultRules: Partial<Record<CspDirectiveName, string[]>> = {
  'script-src': [`'report-sample'`, `'self'`],
  'worker-src': [`'report-sample'`, `'self'`, `blob:`],
  'style-src': [`'report-sample'`, `'self'`, `'unsafe-inline'`],
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

interface CspConfigDirectives {
  enforceDirectives: Map<CspDirectiveName, string[]>;
  reportOnlyDirectives: Map<CspDirectiveName, string[]>;
}

export class CspDirectives {
  private readonly directives = new Map<CspDirectiveName, Set<string>>();
  private readonly reportOnlyDirectives = new Map<CspDirectiveName, Set<string>>();

  addDirectiveValue(directiveName: CspDirectiveName, directiveValue: string, enforce = true) {
    const directivesMap = enforce ? this.directives : this.reportOnlyDirectives;

    if (!directivesMap.has(directiveName)) {
      directivesMap.set(directiveName, new Set());
    }
    directivesMap.get(directiveName)!.add(normalizeDirectiveValue(directiveValue));
  }

  clearDirectiveValues(directiveName: CspDirectiveName) {
    this.directives.delete(directiveName);
    this.reportOnlyDirectives.delete(directiveName);
  }

  getCspHeadersByDisposition() {
    return {
      enforceHeader: this.headerFromDirectives(this.directives),
      reportOnlyHeader: this.headerFromDirectives(this.reportOnlyDirectives),
    };
  }

  getCspHeader() {
    return this.headerFromDirectives(this.directives);
  }

  private headerFromDirectives(directives: Map<CspDirectiveName, Set<string>>): string {
    return [...directives.entries()]
      .map(([name, values]) => {
        return [name, ...values].join(' ');
      })
      .join('; ');
  }

  static fromConfig(
    firstConfig: CspConfigType,
    ...otherConfigs: Array<Partial<CspConfigType>>
  ): CspDirectives {
    const config = otherConfigs.reduce<CspConfigType>(
      (acc, conf) => deepmerge(acc, conf),
      firstConfig
    );
    const cspDirectives = new CspDirectives();

    // combining `default` directive configurations
    Object.entries(defaultRules).forEach(([key, values]) => {
      values?.forEach((value) => {
        cspDirectives.addDirectiveValue(key as CspDirectiveName, value);
      });
    });

    // combining `default` report only directive configurations
    Object.entries(defaultReportOnlyRules).forEach(([key, values]) => {
      values?.forEach((value) => {
        cspDirectives.addDirectiveValue(key as CspDirectiveName, value, false);
      });
    });

    // adding per-directive configuration
    const { enforceDirectives, reportOnlyDirectives } = parseConfigDirectives(config);

    for (const [directiveName, directiveValues] of enforceDirectives.entries()) {
      const additionalValues = additionalRules[directiveName] ?? [];
      [...additionalValues, ...directiveValues].forEach((value) => {
        cspDirectives.addDirectiveValue(directiveName, value);
      });
    }

    for (const [directiveName, directiveValues] of reportOnlyDirectives.entries()) {
      directiveValues.forEach((value) => {
        cspDirectives.addDirectiveValue(directiveName, value, false);
      });
    }

    return cspDirectives;
  }
}

const parseConfigDirectives = (cspConfig: CspConfigType): CspConfigDirectives => {
  const enforceDirectives = new Map<CspDirectiveName, string[]>();
  const reportOnlyDirectives = new Map<CspDirectiveName, string[]>();

  if (cspConfig.script_src?.length) {
    enforceDirectives.set('script-src', cspConfig.script_src);
  }
  if (cspConfig.disableUnsafeEval !== true) {
    enforceDirectives.set('script-src', [
      "'unsafe-eval'",
      ...(enforceDirectives.get('script-src') ?? []),
    ]);
  }
  if (cspConfig.worker_src?.length) {
    enforceDirectives.set('worker-src', cspConfig.worker_src);
  }
  if (cspConfig.style_src?.length) {
    enforceDirectives.set('style-src', cspConfig.style_src);
  }
  if (cspConfig.connect_src?.length) {
    enforceDirectives.set('connect-src', cspConfig.connect_src);
  }
  if (cspConfig.default_src?.length) {
    enforceDirectives.set('default-src', cspConfig.default_src);
  }
  if (cspConfig.font_src?.length) {
    enforceDirectives.set('font-src', cspConfig.font_src);
  }
  if (cspConfig.frame_src?.length) {
    enforceDirectives.set('frame-src', cspConfig.frame_src);
  }
  if (cspConfig.img_src?.length) {
    enforceDirectives.set('img-src', cspConfig.img_src);
  }
  if (cspConfig.frame_ancestors?.length) {
    enforceDirectives.set('frame-ancestors', cspConfig.frame_ancestors);
  }
  if (cspConfig.report_uri?.length) {
    enforceDirectives.set('report-uri', cspConfig.report_uri);
    reportOnlyDirectives.set('report-uri', cspConfig.report_uri);
  }
  if (cspConfig.report_to?.length) {
    enforceDirectives.set('report-to', cspConfig.report_to);
    reportOnlyDirectives.set('report-to', cspConfig.report_to);
  }

  if (cspConfig.report_only?.form_action?.length) {
    reportOnlyDirectives.set('form-action', cspConfig.report_only?.form_action);
  }

  if (cspConfig.report_only?.object_src?.length) {
    reportOnlyDirectives.set('object-src', cspConfig.report_only?.object_src);
  }

  return {
    enforceDirectives,
    reportOnlyDirectives,
  };
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
