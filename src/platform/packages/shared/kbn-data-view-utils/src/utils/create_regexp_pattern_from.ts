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

export const createRegExpPatternFrom = (basePatterns: string | string[], selector: Selector) => {
  const normalizedBasePatterns = normalizeBasePatterns(basePatterns);

  const indexNames = `(?:${normalizedBasePatterns.join('|')})`;
  const selectorsSuffix = `(?:::(?:${escapeRegExp(selector)}))${
    isDefaultSelector(selector) ? '?' : ''
  }`;

  return new RegExp(
    `^(?:${optionalRemoteCluster}${optionalIndexNamePrefix}${indexNames}${optionalIndexNameSuffix}${selectorsSuffix},?)+$`,
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
const optionalIndexNameSuffix = `(?:${segmentBoundary}${nameCharacters})?`;
