/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Where the indices browser was opened from.
 *
 * This affects insertion behavior:
 * - `Badge`: insert at the beginning of the sources list
 * - `Autocomplete`: insert at the cursor position
 */
export enum IndicesBrowserOpenMode {
  Badge = 'badge',
  Autocomplete = 'autocomplete',
}
