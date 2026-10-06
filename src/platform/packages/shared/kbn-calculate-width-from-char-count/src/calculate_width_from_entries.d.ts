/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LIMITS } from './calculate_width_from_char_count';
type GenericObject<T = Record<string, any>> = T;
export declare function calculateWidthFromEntries(
  entries: GenericObject[] | string[],
  labelKeys?: Array<keyof GenericObject>,
  overridesPanelWidths?: Partial<LIMITS>
): number;
export {};
