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
 * Agg Types have moved to the new platform, and are being
 * re-exported from ui/agg_types for backwards compatibility.
 */

import { npStart } from 'ui/new_platform';

// runtime contracts
const { types } = npStart.plugins.data.search.aggs;
export const aggTypes = types.getAll();
export const { createAggConfigs } = npStart.plugins.data.search.aggs;
export const {
  AggConfig,
  AggType,
  aggTypeFieldFilters,
  FieldParamType,
  MetricAggType,
  parentPipelineAggHelper,
  siblingPipelineAggHelper,
} = npStart.plugins.data.search.__LEGACY;

// types
export {
  AggGroupNames,
  AggParam,
  AggParamOption,
  AggParamType,
  AggTypeFieldFilters,
  AggTypeFilters,
  BUCKET_TYPES,
  DateRangeKey,
  IAggConfig,
  IAggConfigs,
  IAggGroupNames,
  IAggType,
  IFieldParamType,
  IMetricAggType,
  IpRangeKey,
  METRIC_TYPES,
  OptionedParamEditorProps,
  OptionedParamType,
  OptionedValueProp,
} from '../../../../plugins/data/public';

// static code
import { search } from '../../../../plugins/data/public';
export const {
  aggGroupNamesMap,
  aggTypeFilters,
  CidrMask,
  convertDateRangeToString,
  convertIPRangeToString,
  intervalOptions,
  isDateHistogramBucketAggConfig,
  isStringType,
  isType,
  isValidInterval,
  parentPipelineType,
  propFilter,
  siblingPipelineType,
  termsAggFilter,
} = search.aggs;

export { ISchemas, Schemas, Schema } from '../../../core_plugins/vis_default_editor/public/schemas';
