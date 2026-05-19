/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActiveFilters } from '../datasource';
/**
 * Derive {@link ActiveFilters} from the current `queryText` in state.
 *
 * This is the single shared derivation point — all consumers that need
 * `ActiveFilters` should call this hook instead of independently calling
 * `useQueryModel` + `toFindItemsFilters`. This avoids redundant EUI
 * `Query.parse` + field resolution on every keystroke.
 */
export declare const useActiveFilters: () => ActiveFilters;
