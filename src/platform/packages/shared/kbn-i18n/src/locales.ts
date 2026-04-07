/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * List of all locales that are officially supported by Kibana.
 */
export const SUPPORTED_LOCALE_IDS: readonly string[] = ['en', 'fr-FR', 'ja-JP', 'zh-CN', 'de-DE'];

/**
 * Supported locales with human-readable labels.
 */
export const SUPPORTED_LOCALES: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'fr-FR', label: 'Français' },
  { id: 'ja-JP', label: '日本語' },
  { id: 'zh-CN', label: '中文' },
  { id: 'de-DE', label: 'Deutsch' },
];
