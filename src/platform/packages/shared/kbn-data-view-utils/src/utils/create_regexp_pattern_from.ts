/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeRegExp } from 'lodash';

type Selector = 'data' | 'failures' | '*';

export interface CreateRegExpPatternFromOptions {
  /**
   * Whether the base pattern may be preceded by another index-name segment (e.g. `shipping-traces`
   * matching `traces`). Defaults to true. When false, the base pattern must be at the start of the
   * index name — after an optional remote cluster and data stream backing index prefix (`.ds-`) — so
   * `traces-*` and `.ds-traces-apm-default-2026.10.14-000001` match but `shipping-traces` does not.
   */
  allowPrefix?: boolean;
}

export const createRegExpPatternFrom = (
  basePatterns: string | string[],
  selector: Selector,
  { allowPrefix = true }: CreateRegExpPatternFromOptions = {}
) => {
  const normalizedBasePatterns = normalizeBasePatterns(basePatterns);

  const indexNames = `(?:${normalizedBasePatterns.join('|')})`;
  const selectorsSuffix = `(?:::(?:${escapeRegExp(selector)}))${
    isDefaultSelector(selector) ? '?' : ''
  }`;
  const indexNamePrefix = allowPrefix ? optionalIndexNamePrefix : optionalBackingIndexPrefix;

  return new RegExp(
    `^(?:${optionalRemoteCluster}${indexNamePrefix}${indexNames}${optionalIndexNameSuffix}${selectorsSuffix},?)+$`,
    'i'
  );
};

const normalizeBasePatterns = (basePatterns: string | string[]): string[] =>
  (Array.isArray(basePatterns) ? basePatterns : [basePatterns]).map(escapeRegExp);

const isDefaultSelector = (selector: Selector): boolean => selector === 'data';

const nameCharacters = '[^:,\\s]+';
const segmentBoundary = '(?:\\b|_)';
const optionalRemoteCluster = `(?:${nameCharacters}:)?`;
const optionalIndexNamePrefix = `(?:${nameCharacters}${segmentBoundary})?`;
const optionalBackingIndexPrefix = '(?:\\.ds-)?';
const optionalIndexNameSuffix = `(?:${segmentBoundary}${nameCharacters})?`;
