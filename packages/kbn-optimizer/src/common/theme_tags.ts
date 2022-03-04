/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ascending } from './array_helpers';

const tags = (...themeTags: string[]) =>
  Object.freeze(themeTags.sort(ascending((tag) => tag)) as ThemeTag[]);

const validTag = (tag: any): tag is ThemeTag => ALL_THEMES.includes(tag);
const isArrayOfStrings = (input: unknown): input is string[] =>
  Array.isArray(input) && input.every((v) => typeof v === 'string');

export type ThemeTags = readonly ThemeTag[];
export type ThemeTag = 'v8light' | 'v8dark';
export const DEFAULT_THEMES = tags('v8light', 'v8dark');
export const ALL_THEMES = tags('v8light', 'v8dark');

export function parseThemeTags(input?: any): ThemeTags {
  if (!input) {
    return DEFAULT_THEMES;
  }

  if (input === '*') {
    return ALL_THEMES;
  }

  if (typeof input === 'string') {
    input = input.split(',').map((tag) => tag.trim());
  }

  if (!isArrayOfStrings(input)) {
    throw new Error(`Invalid theme tags, must be an array of strings`);
  }

  if (!input.length) {
    throw new Error(
      `Invalid theme tags, you must specify at least one of [${ALL_THEMES.join(', ')}]`
    );
  }

  const invalidTags = input.filter((t) => !validTag(t));
  if (invalidTags.length) {
    throw new Error(
      `Invalid theme tags [${invalidTags.join(', ')}], options: [${ALL_THEMES.join(', ')}]`
    );
  }

  return tags(...input);
}
