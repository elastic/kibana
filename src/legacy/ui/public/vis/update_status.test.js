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

import { getUpdateStatus, Status } from './update_status';

// Parts of the tests in this file are generated more dynamically, based on the
// values inside the Status object.Make sure this object has one function per entry
// in Status, that actually change on the passed $scope, what needs to be changed
// so that we expect the getUpdateStatus function to actually detect a change.
const changeFunctions = {
  [Status.AGGS]: ($scope) => $scope.vis.aggs = { foo: 'new' },
  [Status.DATA]: ($scope) => $scope.visData = { foo: 'new' },
  [Status.PARAMS]: ($scope) => $scope.vis.params = { foo: 'new' },
  [Status.RESIZE]: ($scope) => $scope.vis.size = [50, 50],
  [Status.TIME]: ($scope) => $scope.vis.filters.timeRange = { from: 'now-7d', to: 'now' },
  [Status.UI_STATE]: ($scope) => $scope.uiState = { foo: 'new' },
};

describe('getUpdateStatus', () => {

  function getScope() {
    return {
      vis: {
        aggs: {},
        size: [100, 100],
        params: {
        },
        filters: {}
      },
      uiState: {},
      visData: {}
    };
  }

  function initStatusCheckerAndChangeProperty(type, requiresUpdateStatus) {
    const $scope = getScope();
    // Call the getUpdateStatus function initially, so it can store it's current state
    getUpdateStatus(requiresUpdateStatus, $scope, $scope);

    // Get the change function for that specific change type
    const changeFn = changeFunctions[type];
    if (!changeFn) {
      throw new Error(`Please implement the test change function for ${type}.`);
    }

    // Call that change function to manipulate the scope so it changed.
    changeFn($scope);

    return getUpdateStatus(requiresUpdateStatus, $scope, $scope);
  }

  it('should be a function', () => {
    expect(typeof getUpdateStatus).toBe('function');
  });

  Object.entries(Status).forEach(([typeKey, typeValue]) => {
    // This block automatically creates very simple tests for each of the Status
    // keys, so we have simple tests per changed property.
    // If it makes sense to test more specific behavior of a specific change detection
    // please add additional tests for that.

    it(`should detect changes for Status.${typeKey}`, () => {
      // Check whether the required change type is not correctly determined
      const status = initStatusCheckerAndChangeProperty(typeValue, [typeValue]);
      expect(status[typeValue]).toBe(true);
    });

    it(`should not detect changes in other properties when changing Status.${typeKey}`, () => {
      // Only change typeKey, but track changes for all status changes
      const status = initStatusCheckerAndChangeProperty(typeValue, Object.values(Status));
      Object.values(Status)
        // Filter out the actual changed property so we only test for all other properties
        .filter(stat => stat !== typeValue)
        .forEach(otherProp => {
          expect(status[otherProp]).toBeFalsy();
        });
    });

    it(`should not detect changes if not requested for Status.${typeKey}`, () => {
      const allOtherStatusProperties = Object.values(Status).filter(stat => stat !== typeValue);
      // Change only the typeKey property, but do not listen for changes on it
      // listen on all other status changes instead.
      const status = initStatusCheckerAndChangeProperty(typeValue, allOtherStatusProperties);
      // The typeValue check should be falsy, since we did not request tracking it.
      expect(status[typeValue]).toBeFalsy();
    });
  });
});
