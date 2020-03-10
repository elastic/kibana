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

// /// Define plugin function
import { DataPlugin as Plugin } from './plugin';

export function plugin() {
  return new Plugin();
}

// /// Export types & static code

/** @public types */
export { DataSetup, DataStart } from './plugin';
export {
  SavedQueryAttributes,
  SavedQuery,
  SavedQueryTimeFilter,
} from '../../../../plugins/data/public';
export {
  // agg_types
  AggParam, // only the type is used externally, only in vis editor
  AggParamOption, // only the type is used externally
  DateRangeKey, // only used in field formatter deserialization, which will live in data
  IAggConfig,
  IAggConfigs,
  IAggType,
  IFieldParamType,
  IMetricAggType,
  IpRangeKey, // only used in field formatter deserialization, which will live in data
  OptionedParamEditorProps, // only type is used externally
  OptionedValueProp, // only type is used externally
} from './search/types';

/** @public static code */
export * from '../common';
export { FilterStateManager } from './filter/filter_manager';
export {
  // agg_types TODO need to group these under a namespace or prefix
  AggConfigs,
  AggParamType,
  AggTypeFilters, // TODO convert to interface
  aggTypeFilters,
  AggTypeFieldFilters, // TODO convert to interface
  AggGroupNames,
  aggGroupNamesMap,
  BUCKET_TYPES,
  CidrMask,
  convertDateRangeToString,
  convertIPRangeToString,
  intervalOptions, // only used in Discover
  isDateHistogramBucketAggConfig,
  isStringType,
  isType,
  isValidInterval,
  METRIC_TYPES,
  OptionedParamType,
  parentPipelineType,
  propFilter,
  siblingPipelineType,
  termsAggFilter,
  toAbsoluteDates,
  // search_source
  getRequestInspectorStats,
  getResponseInspectorStats,
  tabifyAggResponse,
  tabifyGetColumns,
} from './search';
