/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const PLUGIN_ID = 'profiling';
export const PLUGIN_NAME = 'profiling';

const BASE_ROUTE_PATH = '/api/prodfiler/v2';

export function getRoutePaths() {
  return {
    TopN: `${BASE_ROUTE_PATH}/topn`,
    TopNContainers: `${BASE_ROUTE_PATH}/topn/containers`,
    TopNDeployments: `${BASE_ROUTE_PATH}/topn/deployments`,
    TopNHosts: `${BASE_ROUTE_PATH}/topn/hosts`,
    TopNThreads: `${BASE_ROUTE_PATH}/topn/threads`,
    TopNTraces: `${BASE_ROUTE_PATH}/topn/traces`,
    FlamechartElastic: `${BASE_ROUTE_PATH}/flamechart/elastic`,
    FlamechartPixi: `${BASE_ROUTE_PATH}/flamechart/pixi`,
  };
}

function toMilliseconds(seconds: string): number {
  return parseInt(seconds, 10) * 1000;
}

export function getTopN(obj: any) {
  const data = [];

  if (obj.TopN!) {
    for (const x in obj.TopN) {
      if (obj.TopN.hasOwnProperty(x)) {
        const values = obj.TopN[x];
        for (let i = 0; i < values.length; i++) {
          const v = values[i];
          data.push({ x: toMilliseconds(x), y: v.Count, g: v.Value });
        }
      }
    }
  }

  return data;
}

export function groupSamplesByCategory(samples: any) {
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

export function timeRangeFromRequest(request: any): [number, number] {
  const timeFrom = parseInt(request.query.timeFrom!, 10);
  const timeTo = parseInt(request.query.timeTo!, 10);
  return [timeFrom, timeTo];
}

// Converts from a Map object to a Record object since Map objects are not
// serializable to JSON by default
export function fromMapToRecord<K extends string, V>(m: Map<K, V>): Record<string, V> {
  let output: Record<string, V> = {};

  for (const [key, value] of m) {
    output[key] = value;
  }

  return output;
}
