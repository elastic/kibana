/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** True when a list field's stored value fits tags: nothing, one string, or a list of strings. */
export const isTagValue = (value: unknown): boolean =>
  value === undefined ||
  typeof value === 'string' ||
  (Array.isArray(value) && value.every((item) => typeof item === 'string'));

/** The tags a stored value stands for. A blank string is no value, not an empty tag. */
export const toTags = (value: unknown): string[] => {
  if (typeof value === 'string') return value.trim() === '' ? [] : [value];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
};

/**
 * What to store for a set of tags: one value stays a plain string when the schema allows it,
 * two or more become a list, and none is an empty list (which an optional field drops).
 */
export const fromTags = (tags: readonly string[], acceptsSingle: boolean): string | string[] =>
  acceptsSingle && tags.length === 1 ? tags[0] : [...tags];
