/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepmerge from 'deepmerge';
import type { CspConfigType } from './config';

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
  | 'object-src'
  | 'child-src'
  | 'manifest-src'
  | 'media-src'
  | 'object-src'
  | 'prefetch-src'
  | 'script-src-elem'
  | 'script-src-attr'
  | 'style-src-elem'
  | 'style-src-attr';

/**
 * The default report only directives rules
 */
export const defaultReportOnlyRules: Partial<Record<CspDirectiveName, string[]>> = {
  'form-action': [`'report-sample'`, `'self'`],
  'default-src': [`'report-sample'`, `'none'`],
  'font-src': [`'report-sample'`, `'self'`],
  'img-src': [`'report-sample'`, `'self'`, 'data:', 'tiles.maps.elastic.co'], // Same as below for tiles.maps.elastic.co
  'connect-src': [
    `'report-sample'`,
    `'self'`,
    // TODO: Ideally, Core would not know about these endpoints, as they are governed by the Telemetry plugin.
    // This can be improved once https://github.com/elastic/kibana/issues/181812 is implemented.
    'telemetry.elastic.co',
    'telemetry-staging.elastic.co',
    // Same as above, but these endpoints are related to maps
    'feeds.elastic.co',
    'tiles.maps.elastic.co',
    'vector.maps.elastic.co',
  ],
};

/**
 * The default directives rules that are always applied
 */
export const defaultRules: Partial<Record<CspDirectiveName, string[]>> = {
  'script-src': [`'report-sample'`, `'self'`],
  'worker-src': [`'report-sample'`, `'self'`, `blob:`],
  'style-src': [`'report-sample'`, `'self'`, `'unsafe-inline'`],
  'object-src': [`'report-sample'`, `'none'`],
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

/**
 * Child directives that should inherit from `default-src` if not explicitly set.
 * Reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/default-src
 */
export const defaultSrcChildDirectives: CspDirectiveName[] = [
  'child-src',
  'connect-src',
  'font-src',
  'frame-src',
  'img-src',
  'manifest-src',
  'media-src',
  'object-src',
  'prefetch-src',
  'script-src',
  'script-src-elem',
  'script-src-attr',
  'style-src',
  'style-src-elem',
  'style-src-attr',
  'worker-src',
];

interface CspConfigDirectives {
  enforceDirectives: Map<CspDirectiveName, string[]>;
  reportOnlyDirectives: Map<CspDirectiveName, string[]>;
}

export class CspDirectives {
  private readonly directives = new Map<CspDirectiveName, Set<string>>();
  private readonly reportOnlyDirectives = new Map<CspDirectiveName, Set<string>>();

  addDirectiveValue(directiveName: CspDirectiveName, directiveValue: string, enforce = true) {
    const directivesMap = enforce ? this.directives : this.reportOnlyDirectives;

    let directive = directivesMap.get(directiveName);
    if (!directive) {
      directivesMap.set(directiveName, (directive = new Set()));
    }

    const normalizedDirectiveValue = normalizeDirectiveValue(directiveValue);
    // 'none' can not coexist with other values, and will be ignored by browsers.
    // In practice, this should only happen when a default rule defined above is set to 'none',
    // AND the administrator chose to specify a value via kibana.yml configuration. (e.g. see `object-src` above)
    if (directive.has(`'none'`) && normalizedDirectiveValue !== `'report-sample'`) {
      directive.delete(`'none'`);
    }
    directive.add(normalizedDirectiveValue);

    // If we are testing default-src 'none', then we need to add all expected child directives to the report-only policy
    // to prevent reports from being generated for those child directives.
    const enforcingDefaultSrcChildDirective =
      enforce && defaultSrcChildDirectives.includes(directiveName);
    if (this.isTestingDefaultSrc() && enforcingDefaultSrcChildDirective) {
      this.addDirectiveValue(directiveName, directiveValue, false);
    }
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

  /**
   * Determines if we are currently testing the default-src 'none' configuration.
   * @returns True if we are testing default-src 'none', false otherwise.
   */
  private isTestingDefaultSrc(): boolean {
    return this.reportOnlyDirectives.has('default-src') &&
      this.reportOnlyDirectives.get('default-src')?.has(`'none'`)
      ? true
      : false;
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

    // combining `default` report only directive configurations
    // it's important to add these before the enforced directives below so that we can handle report-only updates
    // in response to enforced directives (e.g., default-src 'none' testing)
    Object.entries(defaultReportOnlyRules).forEach(([key, values]) => {
      values?.forEach((value) => {
        cspDirectives.addDirectiveValue(key as CspDirectiveName, value, false);
      });
    });

    // combining `default` directive configurations
    Object.entries(defaultRules).forEach(([key, values]) => {
      values?.forEach((value) => {
        cspDirectives.addDirectiveValue(key as CspDirectiveName, value);
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
  if (cspConfig.object_src?.length) {
    enforceDirectives.set('object-src', cspConfig.object_src);
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
