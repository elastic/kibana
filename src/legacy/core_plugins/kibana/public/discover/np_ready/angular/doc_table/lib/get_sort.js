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

function isSortable(field, indexPattern) {
  return indexPattern.fields.getByName(field) && indexPattern.fields.getByName(field).sortable;
}

function createSortObject(sortPair, indexPattern) {
  if (Array.isArray(sortPair) && sortPair.length === 2 && isSortable(sortPair[0], indexPattern)) {
    const [field, direction] = sortPair;
    return { [field]: direction };
  } else if (_.isPlainObject(sortPair) && isSortable(Object.keys(sortPair)[0], indexPattern)) {
    return sortPair;
  } else {
    return undefined;
  }
}

/**
 * Take a sorting array and make it into an object
 * @param {array} sort two dimensional array [[fieldToSort, directionToSort]]
 *  or an array of objects [{fieldToSort: directionToSort}]
 * @param {object} indexPattern used for determining default sort
 * @returns {object} a sort object suitable for returning to elasticsearch
 */
export function getSort(sort, indexPattern, defaultSortOrder = 'desc') {
  let sortObjects;
  if (Array.isArray(sort)) {
    sortObjects = _.compact(sort.map(sortPair => createSortObject(sortPair, indexPattern)));
  }

  if (!_.isEmpty(sortObjects)) {
    return sortObjects;
  } else if (indexPattern.timeFieldName && isSortable(indexPattern.timeFieldName, indexPattern)) {
    return [{ [indexPattern.timeFieldName]: defaultSortOrder }];
  } else {
    return [{ _score: 'desc' }];
  }
}

getSort.array = function(sort, indexPattern, defaultSortOrder) {
  return getSort(sort, indexPattern, defaultSortOrder).map(sortPair =>
    _(sortPair)
      .pairs()
      .pop()
  );
};
