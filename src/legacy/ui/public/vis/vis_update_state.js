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

import _ from 'lodash';

/**
 * Will figure out if an heatmap state was saved before the auto coloring
 * feature of heatmaps was created. If so it will set the overwriteColor flag
 * for the label to true if labels are enabled and a non default color has been used.
 * So that those earlier created heatmaps will still use the manual specified color.
 */
function convertHeatmapLabelColor(visState) {
  const hasOverwriteColorParam = _.get(visState, 'params.valueAxes[0].labels.overwriteColor') !== undefined;
  if (visState.type === 'heatmap' && visState.params && !hasOverwriteColorParam) {
    const showLabels = _.get(visState, 'params.valueAxes[0].labels.show', false);
    const color = _.get(visState, 'params.valueAxes[0].labels.color', '#555');
    _.set(visState, 'params.valueAxes[0].labels.overwriteColor', showLabels && color !== '#555');
  }
}

/**
 * Update old terms aggregation format to new terms aggregation format. This will
 * update the following things:
 * - Rewrite orderBy: _term to orderBy: _key (new API in Elasticsearch)
 */
function convertTermAggregation(visState) {
  if (visState.aggs) {
    visState.aggs.forEach(agg => {
      if (agg.type === 'terms' && agg.params && agg.params.orderBy === '_term') {
        agg.params.orderBy = '_key';
      }
    });
  }
}

function convertPropertyNames(visState) {
  // 'showMeticsAtAllLevels' is a legacy typo we'll fix by changing it to 'showMetricsAtAllLevels'.
  if (typeof _.get(visState, 'params.showMeticsAtAllLevels') === 'boolean') {
    visState.params.showMetricsAtAllLevels = visState.params.showMeticsAtAllLevels;
    delete visState.params.showMeticsAtAllLevels;
  }
}

function convertDateHistogramScaleMetrics(visState) {
  if (visState.aggs) {
    visState.aggs.forEach(agg => {
      if (agg.type === 'date_histogram' && agg.params && agg.params.interval !== 'auto' && agg.params.scaleMetricValues === undefined) {
        // Set scaleMetricValues to true for existing date histograms, that haven't had it defined and used an interval that's not equal auto,
        // so that we keep the previous metric scaling example for existing visualizations that might be effected.
        agg.params.scaleMetricValues = true;
      }
    });
  }
}

/**
 * This function is responsible for updating old visStates - the actual saved object
 * object - into the format, that will be required by the current Kibana version.
 * This method will be executed for each saved vis object, that will be loaded.
 * It will return the updated version as Kibana would expect it. It does not modify
 * the passed state.
 */
export const updateOldState = (visState) => {
  if (!visState) return visState;
  const newState = _.cloneDeep(visState);

  convertTermAggregation(newState);
  convertPropertyNames(newState);
  convertDateHistogramScaleMetrics(newState);

  if (visState.type === 'gauge' && visState.fontSize) {
    delete newState.fontSize;
    _.set(newState, 'gauge.style.fontSize', visState.fontSize);
  }

  // update old metric to the new one
  // Changed from 6.0 -> 6.1
  if (['gauge', 'metric'].includes(visState.type) && _.get(visState.params, 'gauge.gaugeType', null) === 'Metric') {
    newState.type = 'metric';
    newState.params.addLegend = false;
    newState.params.type = 'metric';
    newState.params.metric = newState.params.gauge;
    delete newState.params.gauge;
    delete newState.params.metric.gaugeType;
    delete newState.params.metric.gaugeStyle;
    delete newState.params.metric.backStyle;
    delete newState.params.metric.scale;
    delete newState.params.metric.type;
    delete newState.params.metric.orientation;
    delete newState.params.metric.verticalSplit;
    delete newState.params.metric.autoExtend;
    newState.params.metric.metricColorMode = newState.params.metric.gaugeColorMode;
    delete newState.params.metric.gaugeColorMode;
  } else if(visState.type === 'metric' && _.get(visState.params, 'gauge.gaugeType', 'Metric') !== 'Metric') {
    newState.type = 'gauge';
    newState.params.type = 'gauge';
  }

  convertHeatmapLabelColor(newState);

  return newState;
};
