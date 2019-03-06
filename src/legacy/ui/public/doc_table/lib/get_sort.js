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
 * Take a sorting array and make it into an object
 * @param {array} 2 item array [fieldToSort, directionToSort]
 * @param {object} indexPattern used for determining default sort
 * @returns {object} a sort object suitable for returning to elasticsearch
 */
export function getSort(sort, indexPattern, defaultSortOrder = 'desc') {
  const sortObj = {};
  let field;
  let direction;

  function isSortable(field) {
    return (indexPattern.fields.byName[field] && indexPattern.fields.byName[field].sortable);
  }

  if (Array.isArray(sort) && sort.length === 2 && isSortable(sort[0])) {
    // At some point we need to refactor the sorting logic, this array sucks.
    field = sort[0];
    direction = sort[1];
  } else if (indexPattern.timeFieldName && isSortable(indexPattern.timeFieldName)) {
    field = indexPattern.timeFieldName;
    direction = defaultSortOrder;
  }

  if (field) {
    sortObj[field] = direction;
  } else {
    sortObj._score = 'desc';
  }



  return sortObj;
}

getSort.array = function (sort, indexPattern, defaultSortOrder) {
  return _(getSort(sort, indexPattern, defaultSortOrder)).pairs().pop();
};

