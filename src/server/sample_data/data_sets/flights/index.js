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

import { savedObjects } from './saved_objects';

export function flightsSpecProvider() {
  return {
    id: 'flights',
    name: 'Sample flight data',
    description: 'Sample data, visualizations, and dashboards for monitoring flight routes.',
    previewImagePath: '/plugins/kibana/home/sample_data_resources/flights/dashboard.png',
    overviewDashboard: '7adfa750-4c81-11e8-b3d7-01146121b73d',
    defaultIndex: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
    dataPath: './src/server/sample_data/data_sets/flights/flights.json.gz',
    fields: {
      timestamp: {
        type: 'date'
      },
      dayOfWeek: {
        type: 'integer'
      },
      Carrier: {
        type: 'keyword'
      },
      FlightNum: {
        type: 'keyword'
      },
      Origin: {
        type: 'keyword'
      },
      OriginAirportID: {
        type: 'keyword'
      },
      OriginCityName: {
        type: 'keyword'
      },
      OriginRegion: {
        type: 'keyword'
      },
      OriginCountry: {
        type: 'keyword'
      },
      OriginLocation: {
        type: 'geo_point'
      },
      Dest: {
        type: 'keyword'
      },
      DestAirportID: {
        type: 'keyword'
      },
      DestCityName: {
        type: 'keyword'
      },
      DestRegion: {
        type: 'keyword'
      },
      DestCountry: {
        type: 'keyword'
      },
      DestLocation: {
        type: 'geo_point'
      },
      AvgTicketPrice: {
        type: 'float'
      },
      OriginWeather: {
        type: 'keyword'
      },
      DestWeather: {
        type: 'keyword'
      },
      Cancelled: {
        type: 'boolean'
      },
      DistanceMiles: {
        type: 'float'
      },
      DistanceKilometers: {
        type: 'float'
      },
      FlightDelayMin: {
        type: 'integer'
      },
      FlightDelay: {
        type: 'boolean'
      },
      FlightDelayType: {
        type: 'keyword'
      },
      FlightTimeMin: {
        type: 'float'
      },
      FlightTimeHour: {
        type: 'keyword'
      }
    },
    timeFields: ['timestamp'],
    currentTimeMarker: '2018-01-02T00:00:00',
    preserveDayOfWeekTimeOfDay: true,
    savedObjects: savedObjects,
  };
}
