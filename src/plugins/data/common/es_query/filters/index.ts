/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
export const cleanFilter = (filter: Filter): Filter => omit(filter, ['meta', '$state']);

export const isFilterDisabled = (filter: Filter): boolean => get(filter, 'meta.disabled', false);
