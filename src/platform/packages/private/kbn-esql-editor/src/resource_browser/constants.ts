/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Offset to account for the line height
export const BROWSER_POPOVER_VERTICAL_OFFSET = 20;

/** Fallback index pattern when the query has no source (e.g. empty or only processing commands). */
export const DEFAULT_FIELDS_BROWSER_INDEX = '*';

// Commands that should have a badge
// Only FROM and TS commands support sources
export const SUPPORTED_COMMANDS = ['from', 'ts'];
