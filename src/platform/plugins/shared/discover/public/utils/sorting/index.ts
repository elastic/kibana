/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { getDefaultSort } from '../../../common/utils/sorting/get_default_sort';
export { getSort, getSortArray } from '../../../common/utils/sorting/get_sort';
export type { SortPair } from '../../../common/utils/sorting/get_sort';
export { getSortForSearchSource } from '../../../common/utils/sorting/get_sort_for_search_source';
export { getSortForEmbeddable } from './get_sort';
