/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggGroupNames, BUCKET_TYPES, METRIC_TYPES, search } from '@kbn/data-plugin/public';
import * as controls from './controls';
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
  [METRIC_TYPES.TOP_METRICS]: {
    field: controls.FieldParamEditor,
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
