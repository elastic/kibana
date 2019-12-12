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

/**
 * Nothing to see here!
 *
 * Agg Types have moved to the data plugin, and are being
 * re-exported from ui/agg_types for backwards compatibility.
 */

import { start as dataStart } from '../../../core_plugins/data/public/legacy';

// runtime contracts
export const {
  types: aggTypes,
  AggConfig,
  AggConfigs,
  AggType,
  aggTypeFieldFilters,
  FieldParamType,
  parentPipelineAggHelper,
  setBounds,
} = dataStart.search.aggs;

// types
export {
  // agg_types
  AggParam,
  AggParamOption,
  DateRangeKey,
  IpRangeKey,
  OptionedParamEditorProps,
  OptionedValueProp,
} from '../../../core_plugins/data/public';

// static code
export {
  // agg_types
  AggParamType,
  aggTypeFilters,
  CidrMask,
  convertDateRangeToString,
  convertIPRangeToString,
  intervalOptions, // only used in Discover
  isDateHistogramBucketAggConfig,
  isStringType,
  isType,
  isValidInterval,
  isValidJson,
  OptionedParamType,
  propFilter,
} from '../../../core_plugins/data/public';
