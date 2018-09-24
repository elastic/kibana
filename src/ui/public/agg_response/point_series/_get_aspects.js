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
import { makeFakeXAspect } from './_fake_x_aspect';

const map = {
  segment: 'x',
  metric: 'y',
  radius: 'z',
  width: 'width',
  group: 'series'
};

function columnToAspect(aspects, col, i) {
  const schema = col.aggConfig.schema.name;

  const name = map[schema];
  if (!name) throw new TypeError('unknown schema name "' + schema + '"');

  const aspect = {
    i: i,
    title: col.title,
    aggConfig: col.aggConfig
  };

  if (!aspects[name]) aspects[name] = [];
  aspects[name].push(aspect);
}

/**
 * Identify and group the columns based on the aspect of the pointSeries
 * they represent.
 *
 * @param  {array} columns - the list of columns
 * @return {object} - an object with a key for each aspect (see map). The values
 *                    may be undefined, a single aspect, or an array of aspects.
 */
export function getAspects(table) {
  const aspects = _(table.columns)
  // write each column into the aspects under it's group
    .transform(columnToAspect, {})
    // unwrap groups that only have one value, and validate groups that have more
    .transform(function (aspects, group, name) {
      if ((name !== 'y' && name !== 'series') && group.length > 1) {
        throw new TypeError('Only multiple metrics and series are supported in point series');
      }

      aspects[name] = group.length > 1 ? group : group[0];
    })
    .value();

  if (!aspects.x) {
    aspects.x = makeFakeXAspect();
  }

  return aspects;
}
