/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stringify } from 'yaml';

/**
 * Formats structured data as YAML for display: `key: value` rows, `-` list
 * items, and multi-line strings as literal `|` blocks so their line breaks are kept.
 */
export const formatStructuredValue = (value: unknown): string =>
  // lineWidth 0 disables folding, so long lines are left to the code block to wrap.
  stringify(value, { lineWidth: 0, blockQuote: 'literal' }).trimEnd();
