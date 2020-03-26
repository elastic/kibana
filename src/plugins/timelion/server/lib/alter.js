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

import Bluebird from 'bluebird';
import _ from 'lodash';

/* @param {Array} args
 * - args[0] must be a seriesList

 * @params {Function} fn - Function to apply to each series in the seriesList
 * @return {seriesList}
 */

export default function alter(args, fn) {
  // In theory none of the args should ever be promises. This is probably a waste.
  return Bluebird.all(args)
    .then(function(args) {
      const seriesList = args.shift();

      if (seriesList.type !== 'seriesList') {
        throw new Error('args[0] must be a seriesList');
      }

      const list = _.chain(seriesList.list)
        .map(function(series) {
          return fn.apply(this, [series].concat(args));
        })
        .flatten()
        .value();

      seriesList.list = list;
      return seriesList;
    })
    .catch(function(e) {
      throw e;
    });
}
