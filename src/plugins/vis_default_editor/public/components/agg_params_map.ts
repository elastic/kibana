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

import * as controls from './controls';
import { AggGroupNames, BUCKET_TYPES, METRIC_TYPES, search } from '../../../data/public';
import { wrapWithInlineComp } from './controls/utils';

const { siblingPipelineType, parentPipelineType } = search.aggs;

const buckets = {
  [BUCKET_TYPES.DATE_HISTOGRAM]: {
    scaleMetricValues: controls.ScaleMetricsParamEditor,
    interval: controls.TimeIntervalParamEditor,
    drop_partials: controls.DropPartialsParamEditor,
  },
  [BUCKET_TYPES.DATE_RANGE]: {
    ranges: controls.DateRangesParamEditor,
  },
  [BUCKET_TYPES.FILTERS]: {
    filters: controls.FiltersParamEditor,
  },
  [BUCKET_TYPES.GEOHASH_GRID]: {
    autoPrecision: controls.AutoPrecisionParamEditor,
    precision: controls.PrecisionParamEditor,
    useGeocentroid: controls.UseGeocentroidParamEditor,
    isFilteredByCollar: controls.IsFilteredByCollarParamEditor,
  },
  [BUCKET_TYPES.HISTOGRAM]: {
    interval: controls.NumberIntervalParamEditor,
    maxBars: controls.MaxBarsParamEditor,
    min_doc_count: controls.MinDocCountParamEditor,
    has_extended_bounds: controls.HasExtendedBoundsParamEditor,
    extended_bounds: controls.ExtendedBoundsParamEditor,
  },
  [BUCKET_TYPES.IP_RANGE]: {
    ipRangeType: controls.IpRangeTypeParamEditor,
    ranges: controls.IpRangesParamEditor,
  },
  [BUCKET_TYPES.RANGE]: {
    ranges: controls.RangesControl,
  },
  [BUCKET_TYPES.SIGNIFICANT_TERMS]: {
    size: controls.SizeParamEditor,
  },
  [BUCKET_TYPES.TERMS]: {
    include: controls.IncludeExcludeParamEditor,
    exclude: controls.IncludeExcludeParamEditor,
    orderBy: controls.OrderByParamEditor,
    orderAgg: controls.OrderAggParamEditor,
    order: wrapWithInlineComp(controls.OrderParamEditor),
    size: wrapWithInlineComp(controls.SizeParamEditor),
    otherBucket: controls.OtherBucketParamEditor,
    missingBucket: controls.MissingBucketParamEditor,
  },
};

const metrics = {
  [METRIC_TYPES.TOP_HITS]: {
    field: controls.TopFieldParamEditor,
    aggregate: wrapWithInlineComp(controls.TopAggregateParamEditor),
    size: wrapWithInlineComp(controls.TopSizeParamEditor),
    sortField: controls.TopSortFieldParamEditor,
    sortOrder: controls.OrderParamEditor,
  },
  [METRIC_TYPES.PERCENTILES]: {
    percents: controls.PercentilesEditor,
  },
  [METRIC_TYPES.PERCENTILE_RANKS]: {
    values: controls.PercentileRanksEditor,
  },
};

export const aggParamsMap = {
  common: {
    string: controls.StringParamEditor,
    json: controls.RawJsonParamEditor,
    field: controls.FieldParamEditor,
  },
  [siblingPipelineType]: {
    customBucket: controls.SubMetricParamEditor,
    customMetric: controls.SubMetricParamEditor,
  },
  [parentPipelineType]: {
    metricAgg: controls.MetricAggParamEditor,
    customMetric: controls.SubAggParamEditor,
  },
  [AggGroupNames.Buckets]: buckets,
  [AggGroupNames.Metrics]: metrics,
};
