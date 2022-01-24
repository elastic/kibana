/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
export const PLUGIN_ID = 'profiling';
export const PLUGIN_NAME = 'profiling';

export const BASE_ROUTE_PATH = '/api/prodfiler';

export const TOPN_ROUTE_PATH = `${BASE_ROUTE_PATH}/topn`;
export const TOPN_CONTAINERS_ROUTE_PATH = `${TOPN_ROUTE_PATH}/containers`;
export const TOPN_DEPLOYMENTS_ROUTE_PATH = `${TOPN_ROUTE_PATH}/deployments`;
export const TOPN_HOSTS_ROUTE_PATH = `${TOPN_ROUTE_PATH}/hosts`;
export const TOPN_THREADS_ROUTE_PATH = `${TOPN_ROUTE_PATH}/threads`;
export const TOPN_TRACES_ROUTE_PATH = `${TOPN_ROUTE_PATH}/traces`;

export const FLAMECHART_ROUTE_PATH = `${BASE_ROUTE_PATH}/flamechart`;
export const FLAMECHART_CANVAS_ROUTE_PATH = `${FLAMECHART_ROUTE_PATH}/canvas`;
export const FLAMECHART_WEBGL_ROUTE_PATH = `${FLAMECHART_ROUTE_PATH}/webgl`;

export function getTopN(obj) {
  const data = [];
  for (let i = 0; i < obj.topN.histogram.buckets.length; i++) {
    const bucket = obj.topN.histogram.buckets[i];
    for (let j = 0; j < bucket.group_by.buckets.length; j++) {
      const v = bucket.group_by.buckets[j];
      if(typeof v.key === 'string') {
        data.push({x: bucket.key, y: v.Count.value, g: v.key});
      } else {
        data.push({x: bucket.key, y: v.Count.value, g: v.key_as_string});
      }

    }
  }
  return data;
}

export function groupSamplesByCategory(samples) {
  const series = new Map();
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    if (!series.has(v.g)) {
      series.set(v.g, []);
    }
    const value = series.get(v.g);
    value.push([v.x, v.y]);
  }
  return series;
}
