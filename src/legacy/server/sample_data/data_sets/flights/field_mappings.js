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

export const fieldMappings = {
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
};
