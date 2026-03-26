/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const MARKDOWN_ID_REGEX = /^[a-z0-9_\-]+$/; // lowercase letters, numbers, hyphens, and underscores

export const validateMarkdownId = (value: string): boolean =>
  !!value && MARKDOWN_ID_REGEX.test(value);
