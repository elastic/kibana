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

function allSeriesContainKey(seriesList, key) {
  const containsKeyInitialValue = true;
  return seriesList.list.reduce((containsKey, series) => {
    return containsKey && _.has(series, key);
  }, containsKeyInitialValue);
}

/**
 * Pairwise reduce seriesList
 * @params {seriesList} left
 * @params {seriesList} right
 * @params {Function} fn - Function used to combine points at same index in each array of each series in the seriesList.
 * @return {seriesList}
 */
async function pairwiseReduce(left, right, fn) {
  if (left.list.length !== right.list.length) {
    throw new Error('Unable to pairwise reduce seriesLists, number of series are not the same');
  }

  let pairwiseField = 'label';
  if (allSeriesContainKey(left, 'split') && allSeriesContainKey(right, 'split')) {
    pairwiseField = 'split';
  }
  const indexedList = _.keyBy(right.list, pairwiseField);

  // ensure seriesLists contain same pairwise labels
  left.list.forEach((leftSeries) => {
    if (!indexedList[leftSeries[pairwiseField]]) {
      const rightSeriesLabels = right.list
        .map((rightSeries) => {
          return `"${rightSeries[pairwiseField]}"`;
        })
        .join(',');
      throw new Error(
        `Matching series could not be found for "${leftSeries[pairwiseField]}" in [${rightSeriesLabels}]`
      );
    }
  });

  // pairwise reduce seriesLists
  const pairwiseSeriesList = { type: 'seriesList', list: [] };
  left.list.forEach(async (leftSeries) => {
    const first = { type: 'seriesList', list: [leftSeries] };
    const second = { type: 'seriesList', list: [indexedList[leftSeries[pairwiseField]]] };
    const reducedSeriesList = await reduce([first, second], fn);
    const reducedSeries = reducedSeriesList.list[0];
    reducedSeries.label = leftSeries[pairwiseField];
    pairwiseSeriesList.list.push(reducedSeries);
  });
  return pairwiseSeriesList;
}

/**
 * Reduces multiple arrays into a single array using a function
 * @param {Array} args - args[0] must always be a {type: 'seriesList'}
 *
 * - If only arg[0] exists, the seriesList will be reduced to a seriesList containing a single series
 * - If multiple arguments are passed, each argument will be mapped onto each series in the seriesList.

 * @params {Function} fn - Function used to combine points at same index in each array of each series in the seriesList.
 * @return {seriesList}
 */
async function reduce(argsPromises, fn) {
  const args = await Promise.all(argsPromises);

  const seriesList = args.shift();
  let argument = args.shift();

  if (seriesList.type !== 'seriesList') {
    throw new Error('input must be a seriesList');
  }

  if (_.isObject(argument) && argument.type === 'seriesList') {
    if (argument.list.length > 1) {
      return await pairwiseReduce(seriesList, argument, fn);
    } else {
      argument = argument.list[0];
    }
  }

  function reduceSeries(series) {
    return _.reduce(series, function (destinationObject, argument, i, p) {
      let output = _.map(destinationObject.data, function (point, index) {
        const value = point[1];

        if (value == null) {
          return [point[0], null];
        }

        if (_.isNumber(argument)) {
          return [point[0], fn(value, argument, i, p)];
        }

        if (argument.data[index] == null || argument.data[index][1] == null) {
          return [point[0], null];
        }
        return [point[0], fn(value, argument.data[index][1], i, p)];
      });

      // Output = single series

      output = {
        data: output,
      };
      output = _.defaults(output, destinationObject);
      return output;
    });
  }

  let reduced;

  if (argument != null) {
    reduced = _.map(seriesList.list, function (series) {
      return reduceSeries([series].concat(argument));
    });
  } else {
    reduced = [reduceSeries(seriesList.list)];
  }

  seriesList.list = reduced;
  return seriesList;
}

export default reduce;
