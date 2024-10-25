/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ThemeVersion } from '@kbn/ui-shared-deps-npm';

export const DEFAULT_THEME_VERSION: ThemeVersion = 'v8';
export const AVAILABLE_THEME_VERSIONS: string[] = ['v8', 'borealis'];

export const ThemeAmsterdamTags = ['v8light', 'v8dark'] as const;
export const ThemeBorealisTags = ['borealislight', 'borealisdark'] as const;
export const AVAILABLE_THEME_TAGS = [...ThemeAmsterdamTags, ...ThemeBorealisTags];
