/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OptionsListSearchTechnique } from '../../../../../common/options_list/suggestions_searching';
import { OptionsListSortingType } from '../../../../../common/options_list/suggestions_sorting';

export const DEFAULT_SEARCH_TECHNIQUE: OptionsListSearchTechnique = 'prefix';
export const OPTIONS_LIST_DEFAULT_SORT: OptionsListSortingType = {
  by: '_count',
  direction: 'desc',
};

export const MIN_OPTIONS_LIST_REQUEST_SIZE = 10;
export const MAX_OPTIONS_LIST_REQUEST_SIZE = 1000;
