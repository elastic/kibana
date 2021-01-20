/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { omit, get } from 'lodash';
import { Filter } from './meta_filter';

export * from './build_filters';
export * from './custom_filter';
export * from './exists_filter';
export * from './geo_bounding_box_filter';
export * from './geo_polygon_filter';
export * from './get_display_value';
export * from './get_filter_field';
export * from './get_filter_params';
export * from './get_index_pattern_from_filter';
export * from './match_all_filter';
export * from './meta_filter';
export * from './missing_filter';
export * from './phrase_filter';
export * from './phrases_filter';
export * from './query_string_filter';
export * from './range_filter';

export * from './types';

/**
 * Clean out any invalid attributes from the filters
 * @param {object} filter The filter to clean
 * @returns {object}
 */
export const cleanFilter = (filter: Filter): Filter => omit(filter, ['meta', '$state']) as Filter;

export const isFilterDisabled = (filter: Filter): boolean => get(filter, 'meta.disabled', false);
