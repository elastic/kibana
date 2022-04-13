/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { map, uniq } from 'lodash';
import { flights } from './flights_data';
import { DataView, DataViewField, IIndexPatternFieldList } from '../../../../data_views/public';

export type Flight = typeof flights[number];
export type FlightField = keyof Flight;

export const flightFieldNames: FlightField[] = [
  'AvgTicketPrice',
  'Cancelled',
  'Carrier',
  'dayOfWeek',
  'Dest',
  'DestAirportID',
  'DestCityName',
  'DestCountry',
  'DestLocation',
  'DestRegion',
  'DestWeather',
  'DistanceKilometers',
  'DistanceMiles',
  'FlightDelay',
  'FlightDelayMin',
  'FlightDelayType',
  'FlightNum',
  'FlightTimeHour',
  'FlightTimeMin',
  'Origin',
  'OriginAirportID',
  'OriginCityName',
  'OriginCountry',
  'OriginLocation',
  'OriginRegion',
  'OriginWeather',
  'timestamp',
];

const numberFields = [
  'AvgTicketPrice',
  'dayOfWeek',
  'DistanceKilometers',
  'DistanceMiles',
  'FlightDelayMin',
  'FlightTimeHour',
  'FlightTimeMin',
];

export const flightFieldByName: { [key: string]: DataViewField } = {};
flightFieldNames.forEach(
  (flightFieldName) =>
    (flightFieldByName[flightFieldName] = {
      name: flightFieldName,
      type: numberFields.includes(flightFieldName) ? 'number' : 'string',
      aggregatable: true,
    } as unknown as DataViewField)
);
flightFieldByName.Cancelled = { name: 'Cancelled', type: 'boolean' } as DataViewField;
flightFieldByName.timestamp = { name: 'timestamp', type: 'date' } as DataViewField;

export const flightFields: DataViewField[] = Object.values(flightFieldByName);

export const storybookFlightsDataView: DataView = {
  id: 'demoDataFlights',
  title: 'demo data flights',
  fields: flightFields as unknown as IIndexPatternFieldList,
  getFieldByName: (name: string) => flightFieldByName[name],
} as unknown as DataView;

export const getFlightOptions = (field: string) => uniq(map(flights, field)).sort();

export const getFlightSearchOptions = (field: string, search?: string): string[] => {
  const options = getFlightOptions(field)
    .map((option) => option + '')
    .filter((option) => !search || option.toLowerCase().includes(search.toLowerCase()));
  if (options.length > 10) options.length = 10;
  return options;
};

export const getFlightOptionsAsync = ({ field, query }: { field: DataViewField; query: string }) =>
  new Promise<string[]>((r) => setTimeout(() => r(getFlightSearchOptions(field.name, query)), 120));
