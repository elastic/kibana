/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { FieldPicker } from './field_picker';

import { DataView, DataViewField, IIndexPatternFieldList } from '../../../../data_views/common';

// TODO: we probably should remove this once the PR is merged that has better data views for stories
const flightFieldNames: string[] = [
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
const flightFieldByName: { [key: string]: DataViewField } = {};
flightFieldNames.forEach(
  (flightFieldName) =>
    (flightFieldByName[flightFieldName] = {
      name: flightFieldName,
      type: 'string',
    } as unknown as DataViewField)
);

// Change some types manually for now
flightFieldByName.Cancelled = { name: 'Cancelled', type: 'boolean' } as DataViewField;
flightFieldByName.timestamp = { name: 'timestamp', type: 'date' } as DataViewField;

const flightFields: DataViewField[] = Object.values(flightFieldByName);
const storybookFlightsDataView: DataView = {
  id: 'demoDataFlights',
  title: 'demo data flights',
  fields: flightFields as unknown as IIndexPatternFieldList,
  getFieldByName: (name: string) => flightFieldByName[name],
} as unknown as DataView;

export default {
  component: FieldPicker,
  title: 'Field Picker',
};

export const FieldPickerWithDataView = () => {
  return <FieldPicker dataView={storybookFlightsDataView} />;
};

export const FieldPickerWithFilter = () => {
  return (
    <FieldPicker
      dataView={storybookFlightsDataView}
      filterPredicate={(f: DataViewField) => {
        // Only show fields with "Dest" in the title
        return f.name.includes('Dest');
      }}
    />
  );
};

export const FieldPickerWithoutIndexPattern = () => {
  return <FieldPicker dataView={null} />;
};
