/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
export declare const defaultReportOnlyRules: Partial<Record<CspDirectiveName, string[]>>;
/**
 * The default directives rules that are always applied
 */
export declare const defaultRules: Partial<Record<CspDirectiveName, string[]>>;
/**
 * Per-directive rules that will be added when the configuration contains at least one value
 * Main purpose is to add `self` value to some directives when the configuration specifies other values
 */
export declare const additionalRules: Partial<Record<CspDirectiveName, string[]>>;
/**
 * Child directives that should inherit from `default-src` if not explicitly set.
 * Reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/default-src
 */
export declare const defaultSrcChildDirectives: CspDirectiveName[];
export declare class CspDirectives {
  private readonly directives;
  private readonly reportOnlyDirectives;
  addDirectiveValue(
    directiveName: CspDirectiveName,
    directiveValue: string,
    enforce?: boolean
  ): void;
  clearDirectiveValues(directiveName: CspDirectiveName): void;
  getCspHeadersByDisposition(): {
    enforceHeader: string;
    reportOnlyHeader: string;
  };
  getCspHeader(): string;
  private headerFromDirectives;
  /**
   * Determines if we are currently testing the default-src 'none' configuration.
   * @returns True if we are testing default-src 'none', false otherwise.
   */
  private isTestingDefaultSrc;
  static fromConfig(
    firstConfig: CspConfigType,
    ...otherConfigs: Array<Partial<CspConfigType>>
  ): CspDirectives;
}
