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

import { prepareJson } from '../utilities';

export const table = (visState: any, schemas: any) => {
  const {
    perPage,
    showMetricsAtAllLevels,
    showPartialRows,
    showTotal,
    totalFunc,
    ...restParams
  } = visState.params;
  const {
    metric: metrics,
    bucket: buckets = [],
    split_row: splitRow,
    split_column: splitColumn,
  } = schemas;
  const visConfig = {
    ...restParams,
    dimensions: {
      metrics,
      buckets,
      splitRow,
      splitColumn,
    },
  };

  if (showMetricsAtAllLevels === false && showPartialRows === true) {
    // Handle case where user wants to see partial rows but not metrics at all levels.
    // This requires calculating how many metrics will come back in the tabified response,
    // and removing all metrics from the dimensions except the last set.
    const metricsPerBucket = metrics.length / buckets.length;
    visConfig.dimensions.metrics.splice(0, metricsPerBucket * buckets.length - metricsPerBucket);
  }

  let expr = `kibana_table ${prepareJson('visConfig', visConfig).trim()}`;

  if (perPage) {
    expr += ` perPage=${perPage}`;
  }
  if (showMetricsAtAllLevels !== undefined) {
    expr += ` showMetricsAtAllLevels=${showMetricsAtAllLevels}`;
  }
  if (showPartialRows !== undefined) {
    expr += ` showPartialRows=${showPartialRows}`;
  }
  if (showTotal !== undefined) {
    expr += ` showTotal=${showTotal}`;
  }
  if (totalFunc) {
    expr += ` totalFunc="${totalFunc}"`;
  }

  return expr;
};
