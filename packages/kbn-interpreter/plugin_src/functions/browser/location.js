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

const noop = () => {};

export const location = () => ({
  name: 'location',
  type: 'datatable',
  context: {
    types: ['null'],
  },
  help:
    'Use the browser\'s location functionality to get your current location. Usually quite slow, but fairly accurate',
  fn: () => {
    return new Promise(resolve => {
      function createLocation(geoposition) {
        const { latitude, longitude } = geoposition.coords;
        return resolve({
          type: 'datatable',
          columns: [{ name: 'latitude', type: 'number' }, { name: 'longitude', type: 'number' }],
          rows: [{ latitude, longitude }],
        });
      }
      return navigator.geolocation.getCurrentPosition(createLocation, noop, {
        maximumAge: 5000,
      });
    });
  },
});
