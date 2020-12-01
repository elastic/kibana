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

import { isEqual } from 'lodash';

/**
 * Checks if given job configs are compatible by attempting to merge them
 *
 * @param jobs
 * @returns {boolean}
 */
export function areJobsCompatible(jobs = []) {
  if (!jobs || !Array.isArray(jobs)) return false;
  if (jobs.length <= 1) return true;

  try {
    mergeJobConfigurations(jobs);
  } catch (e) {
    return false;
  }

  return true;
}

/**
 * Attempts to merge job configurations into a new configuration object keyed
 * by aggregation, then by field
 *
 * @param jobs
 * @returns {{}}
 */
export function mergeJobConfigurations(jobs = []) {
  if (!jobs || !Array.isArray(jobs) || !jobs.length) {
    throw new Error('No capabilities available');
  }

  const allAggs: { [key: string]: any } = {};

  // For each job, look through all of its fields
  jobs.forEach((job: { fields: { [key: string]: any } }) => {
    const fields = job.fields;
    const fieldNames = Object.keys(fields);

    // Check each field
    fieldNames.forEach((fieldName) => {
      const fieldAggs = fields[fieldName];

      // Look through each field's capabilities (aggregations)
      fieldAggs.forEach((agg: { agg: string; interval: string }) => {
        const aggName = agg.agg;
        const aggDoesntExist = !allAggs[aggName];
        const fieldDoesntExist = allAggs[aggName] && !allAggs[aggName][fieldName];
        const isDateHistogramAgg = aggName === 'date_histogram';

        // If we currently don't have this aggregation, add it.
        // Special case for date histogram, since there can only be one
        // date histogram field.
        if (aggDoesntExist || (fieldDoesntExist && !isDateHistogramAgg)) {
          allAggs[aggName] = allAggs[aggName] || {};
          allAggs[aggName][fieldName] = { ...agg };
        }
        // If aggregation already exists, attempt to merge it
        else {
          const fieldAgg = allAggs[aggName][fieldName];

          switch (aggName) {
            // For histograms, calculate the least common multiple between the
            // new interval and existing interval
            case 'histogram':
              // TODO: Fix this with LCD algorithm
              const intervals = [fieldAgg.interval, agg.interval].sort((a, b) => a - b);
              const isMultiple = intervals[1] % intervals[0] === 0;
              fieldAgg.interval = isMultiple ? intervals[1] : intervals[0] * intervals[1];
              break;

            // For date histograms, if it is on the same field, check that the configuration is identical,
            // otherwise reject. If not the same field, reject;
            case 'date_histogram':
              if (fieldDoesntExist || !isEqual(fieldAgg, agg)) {
                throw new Error('Multiple date histograms configured');
              }
              break;

            // For other aggs (terms, metric aggs), no merging is necessary
            default:
              break;
          }
        }
      });
    });
  });

  return {
    aggs: allAggs,
  };
}
