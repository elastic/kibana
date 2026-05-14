/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const getProjectionFieldScore = (fieldName: string, axis: 'x' | 'y') => {
  const normalized = fieldName.toLowerCase();

  if (normalized === axis || normalized.endsWith(`.${axis}`)) {
    return 100;
  }

  if (
    normalized.includes(`projection.${axis}`) ||
    normalized.includes(`projection_${axis}`) ||
    normalized.includes(`umap_${axis}`) ||
    normalized.includes(`umap.${axis}`)
  ) {
    return 90;
  }

  if (normalized.endsWith(`_${axis}`) || normalized.includes(`.${axis}_`)) {
    return 75;
  }

  if (normalized.includes(axis)) {
    return 50;
  }

  return 0;
};

export const getSuggestedProjectionField = (fields: readonly string[], axis: 'x' | 'y') => {
  const rankedField = [...fields].sort((left, right) => {
    const leftScore = getProjectionFieldScore(left, axis);
    const rightScore = getProjectionFieldScore(right, axis);

    if (leftScore === rightScore) {
      return left.localeCompare(right);
    }

    return rightScore - leftScore;
  })[0];

  if (!rankedField || getProjectionFieldScore(rankedField, axis) === 0) {
    return '';
  }

  return rankedField;
};

export const getSuggestedField = (fields: readonly string[], candidates: readonly string[]) => {
  const loweredCandidates = candidates.map((candidate) => candidate.toLowerCase());
  return (
    fields.find((field) =>
      loweredCandidates.some((candidate) => field.toLowerCase().includes(candidate))
    ) ??
    fields[0] ??
    ''
  );
};
