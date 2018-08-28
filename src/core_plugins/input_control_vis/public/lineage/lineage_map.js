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

export function getLineageMap(controlParamsList) {
  function getControlParamsById(controlId) {
    return controlParamsList.find((controlParams) => {
      return controlParams.id === controlId;
    });
  }

  const lineageMap = new Map();
  controlParamsList.forEach((rootControlParams) => {
    const lineage = [rootControlParams.id];
    const getLineage = (controlParams) => {
      if (_.has(controlParams, 'parent') && controlParams.parent !== '' && !lineage.includes(controlParams.parent)) {
        lineage.push(controlParams.parent);
        const parent = getControlParamsById(controlParams.parent);
        getLineage(parent);
      }
    };

    getLineage(rootControlParams);
    lineageMap.set(rootControlParams.id, lineage);
  });
  return lineageMap;
}
