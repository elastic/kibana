/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParsedQuery, UrlStateSlices } from './types';
export interface LegacyDecodeResult {
  state: UrlStateSlices;
  consumed: ReadonlyArray<string>;
}
/**
 * Decodes legacy URL parameters into a {@link UrlStateSlices} object.
 *
 * @param params - The parsed URL parameters.
 * @param validSortFields - The valid sort fields.
 * @param onUnknownValue - A callback to call when an unknown value is encountered.
 * @returns A {@link LegacyDecodeResult} object.
 */
export declare const decodeLegacyParams: (
  params: ParsedQuery,
  validSortFields: ReadonlySet<string>,
  onUnknownValue?: (key: string, value: unknown) => void
) => LegacyDecodeResult | null;
