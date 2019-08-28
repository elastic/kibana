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

// TODO: this should be moved to vis_update_state
// Currently the migration takes place in Vis when calling setCurrentState.
// It should rather convert the raw saved object before starting to instantiate
// any JavaScript classes from it.
const updateVisualizationConfig = (stateConfig, config) => {
  if (!stateConfig || stateConfig.seriesParams) return;
  if (!['line', 'area', 'histogram'].includes(config.type)) return;

  // update value axis options
  const isUserDefinedYAxis = config.setYExtents;
  const defaultYExtents = config.defaultYExtents;
  const mode = ['stacked', 'overlap'].includes(config.mode) ? 'normal' : config.mode || 'normal';
  config.valueAxes[0].scale = {
    ...config.valueAxes[0].scale,
    type: config.scale || 'linear',
    setYExtents: config.setYExtents || false,
    defaultYExtents: config.defaultYExtents || false,
    boundsMargin: defaultYExtents ? config.boundsMargin : 0,
    min: isUserDefinedYAxis ? config.yAxis.min : undefined,
    max: isUserDefinedYAxis ? config.yAxis.max : undefined,
    mode: mode
  };

  // update series options
  const interpolate = config.smoothLines ? 'cardinal' : config.interpolate;
  const stacked = ['stacked', 'percentage', 'wiggle', 'silhouette'].includes(config.mode);
  config.seriesParams[0] = {
    ...config.seriesParams[0],
    type: config.type || 'line',
    mode: stacked ? 'stacked' : 'normal',
    interpolate: interpolate,
    drawLinesBetweenPoints: config.drawLinesBetweenPoints,
    showCircles: config.showCircles,
    radiusRatio: config.radiusRatio
  };
};

export { updateVisualizationConfig };
