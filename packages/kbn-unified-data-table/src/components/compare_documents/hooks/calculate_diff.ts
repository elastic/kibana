/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { diffChars, diffJson, diffLines, diffWords } from 'diff';
import type { DocumentDiffMode } from '../types';

export interface CalculateDiffProps {
  diffMode: Exclude<DocumentDiffMode, 'basic'>;
  baseValue: unknown;
  comparisonValue: unknown;
}

export const calculateDiff = ({ diffMode, baseValue, comparisonValue }: CalculateDiffProps) => {
  const forceJson =
    baseValue != null &&
    comparisonValue != null &&
    ((hasLengthOne(baseValue) && !hasLengthOne(comparisonValue)) ||
      (!hasLengthOne(baseValue) && hasLengthOne(comparisonValue)));

  const { value: formattedBaseValue, isJson: baseValueIsJson } = formatDiffValue(
    baseValue,
    forceJson
  );

  const { value: formattedComparisonValue, isJson: comparisonValueIsJson } = formatDiffValue(
    comparisonValue,
    forceJson
  );

  if (diffMode === 'chars') {
    return diffChars(formattedBaseValue, formattedComparisonValue);
  }

  if (diffMode === 'words') {
    return diffWords(formattedBaseValue, formattedComparisonValue, { ignoreWhitespace: false });
  }

  return baseValueIsJson && comparisonValueIsJson
    ? diffJson(formattedBaseValue, formattedComparisonValue, { ignoreWhitespace: false })
    : diffLines(formattedBaseValue, formattedComparisonValue, { ignoreWhitespace: false });
};

export const formatDiffValue = (value: unknown, forceJson: boolean) => {
  const extractedValue = !forceJson && hasLengthOne(value) ? value[0] : value;

  if (value != null && (forceJson || typeof extractedValue === 'object')) {
    return { value: JSON.stringify(extractedValue, null, 2), isJson: true };
  }

  return { value: String(extractedValue ?? ''), isJson: false };
};

const hasLengthOne = (value: unknown): value is unknown[] => {
  return Array.isArray(value) && value.length === 1;
};
