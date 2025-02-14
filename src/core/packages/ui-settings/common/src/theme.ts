/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const DEFAULT_THEME_NAME = 'borealis';
export const SUPPORTED_THEME_NAMES = ['amsterdam', 'borealis'] as const;

export type ThemeName = (typeof SUPPORTED_THEME_NAMES)[number];

/**
 * Theme tags of the Amsterdam theme
 */
export const ThemeAmsterdamTags = ['v8light', 'v8dark'] as const;

/**
 * Theme tags of the experimental Borealis theme
 */
export const ThemeBorealisTags = ['borealislight', 'borealisdark'] as const;

/**
 * An array of all theme tags supported by Kibana. Note that this list doesn't
 * reflect what theme tags are available in a Kibana build.
 */
export const SUPPORTED_THEME_TAGS = [...ThemeAmsterdamTags, ...ThemeBorealisTags] as const;

export type ThemeTag = (typeof SUPPORTED_THEME_TAGS)[number];
export type ThemeTags = readonly ThemeTag[];

/**
 * An array of theme tags available in Kibana by default when not customized
 * using KBN_OPTIMIZER_THEMES environment variable.
 */
export const DEFAULT_THEME_TAGS: ThemeTags = SUPPORTED_THEME_TAGS;

export const FALLBACK_THEME_TAG: ThemeTag = 'borealislight';

const isValidTag = (tag: unknown) =>
  SUPPORTED_THEME_TAGS.includes(tag as (typeof SUPPORTED_THEME_TAGS)[number]);

export function parseThemeTags(input?: unknown): ThemeTags {
  if (!input || input === '*') {
    return DEFAULT_THEME_TAGS;
  }

  let rawTags: string[];
  if (typeof input === 'string') {
    rawTags = input.split(',').map((tag) => tag.trim());
  } else if (Array.isArray(input)) {
    rawTags = input;
  } else {
    throw new Error('Invalid theme tags, must be an array of strings');
  }

  if (!rawTags.length) {
    throw new Error(
      `Invalid theme tags, you must specify at least one of [${SUPPORTED_THEME_TAGS.join(', ')}]`
    );
  }

  const invalidTags = rawTags.filter((t) => !isValidTag(t));
  if (invalidTags.length) {
    throw new Error(
      `Invalid theme tags [${invalidTags.join(', ')}], options: [${SUPPORTED_THEME_TAGS.join(
        ', '
      )}]`
    );
  }

  return rawTags as ThemeTags;
}

export const hasNonDefaultThemeTags = (tags: ThemeTags) =>
  tags.length !== DEFAULT_THEME_TAGS.length ||
  tags.some((tag) => !DEFAULT_THEME_TAGS.includes(tag as (typeof DEFAULT_THEME_TAGS)[number]));

export const parseThemeNameValue = (value: unknown): ThemeName => {
  if (typeof value !== 'string') {
    return DEFAULT_THEME_NAME;
  }

  const themeName = value.toLowerCase();
  if (SUPPORTED_THEME_NAMES.includes(themeName.toLowerCase() as ThemeName)) {
    return themeName as ThemeName;
  }

  return DEFAULT_THEME_NAME;
};
