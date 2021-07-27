/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { map, uniq } from 'lodash';
import { EuiSelectableOption } from '@elastic/eui';

import { flights } from '../../fixtures/flights';

export type Flight = typeof flights[number];
export type FlightField = keyof Flight;

export const getOptions = (field: string) => uniq(map(flights, field)).sort();

export const getEuiSelectableOptions = (field: string, search?: string): EuiSelectableOption[] => {
  const options = getOptions(field)
    .map((option) => ({
      label: option + '',
      searchableLabel: option + '',
    }))
    .filter((option) => !search || option.label.toLowerCase().includes(search.toLowerCase()));
  if (options.length > 10) options.length = 10;
  return options;
};

export const flightFieldLabels: Record<FlightField, string> = {
  AvgTicketPrice: 'Average Ticket Price',
  Cancelled: 'Cancelled',
  Carrier: 'Carrier',
  dayOfWeek: 'Day of Week',
  Dest: 'Destination',
  DestAirportID: 'Destination Airport ID',
  DestCityName: 'Destination City',
  DestCountry: 'Destination Country',
  DestLocation: 'Destination Location',
  DestRegion: 'Destination Region',
  DestWeather: 'Destination Weather',
  DistanceKilometers: 'Distance (km)',
  DistanceMiles: 'Distance (mi)',
  FlightDelay: 'Flight Delay',
  FlightDelayMin: 'Flight Delay (min)',
  FlightDelayType: 'Flight Delay Type',
  FlightNum: 'Flight Number',
  FlightTimeHour: 'Flight Time (hr)',
  FlightTimeMin: 'Flight Time (min)',
  Origin: 'Origin',
  OriginAirportID: 'Origin Airport ID',
  OriginCityName: 'Origin City',
  OriginCountry: 'Origin Country',
  OriginLocation: 'Origin Location',
  OriginRegion: 'Origin Region',
  OriginWeather: 'Origin Weather',
  timestamp: 'Timestamp',
};

export const flightFields = Object.keys(flightFieldLabels) as FlightField[];
