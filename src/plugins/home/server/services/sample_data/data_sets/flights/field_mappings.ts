/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const fieldMappings = {
  timestamp: {
    type: 'date',
  },
  dayOfWeek: {
    type: 'integer',
  },
  Carrier: {
    type: 'keyword',
  },
  FlightNum: {
    type: 'keyword',
  },
  Origin: {
    type: 'keyword',
  },
  OriginAirportID: {
    type: 'keyword',
  },
  OriginCityName: {
    type: 'keyword',
  },
  OriginRegion: {
    type: 'keyword',
  },
  OriginCountry: {
    type: 'keyword',
  },
  OriginLocation: {
    type: 'geo_point',
  },
  Dest: {
    type: 'keyword',
  },
  DestAirportID: {
    type: 'keyword',
  },
  DestCityName: {
    type: 'keyword',
  },
  DestRegion: {
    type: 'keyword',
  },
  DestCountry: {
    type: 'keyword',
  },
  DestLocation: {
    type: 'geo_point',
  },
  AvgTicketPrice: {
    type: 'float',
  },
  OriginWeather: {
    type: 'keyword',
  },
  DestWeather: {
    type: 'keyword',
  },
  Cancelled: {
    type: 'boolean',
  },
  DistanceMiles: {
    type: 'float',
  },
  DistanceKilometers: {
    type: 'float',
  },
  FlightDelayMin: {
    type: 'integer',
  },
  FlightDelay: {
    type: 'boolean',
  },
  FlightDelayType: {
    type: 'keyword',
  },
  FlightTimeMin: {
    type: 'float',
  },
  FlightTimeHour: {
    type: 'keyword',
  },
};
