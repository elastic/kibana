/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { FieldFormatsRegistry, baseFormatters } from '@kbn/field-formats-plugin/common';
import type { FieldFormatsGetConfigFn } from '@kbn/field-formats-plugin/common';
import { DataViewSource } from './data_view_source';
import { EsqlSource } from './esql_source';

// The date formatters are registered by the plugin, not by `baseFormatters`, so dates map to another one.
// `date_nanos` is keyed by an Elasticsearch type (`es: true`), which wins over the Kibana type `date`.
const defaultTypeMap = {
  ip: { id: 'ip', params: {} },
  date: { id: 'relative_date', params: {} },
  date_nanos: { id: 'duration', params: {}, es: true },
  number: { id: 'number', params: {} },
  boolean: { id: 'boolean', params: {} },
  geo_point: { id: 'geo_point', params: {} },
  _default_: { id: 'string', params: {} },
};

const buildFieldFormats = () => {
  const registry = new FieldFormatsRegistry();
  registry.init(
    ((key: string) =>
      key === 'format:defaultTypeMap' ? defaultTypeMap : undefined) as FieldFormatsGetConfigFn,
    {},
    baseFormatters
  );
  return registry;
};

const fieldsToTest = [
  { name: 'host', type: 'string', esTypes: ['keyword'] },
  { name: 'message', type: 'string', esTypes: ['text'] },
  { name: 'bytes', type: 'number', esTypes: ['long'] },
  { name: 'ratio', type: 'number', esTypes: ['double'] },
  { name: '@timestamp', type: 'date', esTypes: ['date'] },
  { name: 'precise_time', type: 'date', esTypes: ['date_nanos'] },
  { name: 'is_error', type: 'boolean', esTypes: ['boolean'] },
  { name: 'client.ip', type: 'ip', esTypes: ['ip'] },
  { name: 'location', type: 'geo_point', esTypes: ['geo_point'] },
  { name: 'conflicting', type: 'unknown', esTypes: ['unsupported'] },
];

const buildDataView = (
  fieldFormats: FieldFormatsRegistry,
  spec: Partial<DataViewSpec> = {}
): DataView =>
  new DataView({
    fieldFormats,
    spec: {
      id: 'logs',
      title: 'logs-*',
      fields: Object.fromEntries(
        fieldsToTest.map((field) => [
          field.name,
          { ...field, searchable: true, aggregatable: false },
        ])
      ),
      ...spec,
    },
  });

const getTestField = (name: string) => {
  const field = fieldsToTest.find((candidate) => candidate.name === name);
  if (!field) {
    throw new Error(`There is no test field ${name}`);
  }
  return field;
};

const getDataViewField = (dataView: DataView, name: string) => {
  const field = dataView.fields.getByName(name);
  if (!field) {
    throw new Error(`The data view has no field ${name}`);
  }
  return field;
};

describe('getFormatter', () => {
  beforeEach(() => {
    EsqlSource.clearCache();
  });

  describe('of an ES|QL source', () => {
    it('is the default formatter of the type of the field', async () => {
      const fieldFormats = buildFieldFormats();
      const source = await EsqlSource.create({ query: 'FROM logs-*', resultColumns: [] });
      const getDefaultInstance = jest.spyOn(fieldFormats, 'getDefaultInstance');

      const formatter = source.getFormatter(fieldsToTest[2], fieldFormats);

      expect(getDefaultInstance).toHaveBeenCalledWith('number', ['long']);
      expect(formatter.type.id).toBe('number');
    });

    it('answers like the data view of the shim for every type, when it has no custom format', async () => {
      const fieldFormats = buildFieldFormats();
      const dataView = buildDataView(fieldFormats);
      const source = await EsqlSource.create({ query: 'FROM logs-*', resultColumns: [] });

      const ids = fieldsToTest.map((field) => {
        const fromDataView = dataView.getFormatterForField(getDataViewField(dataView, field.name));
        const fromSource = source.getFormatter(field, fieldFormats);

        expect(fromSource.toJSON()).toEqual(fromDataView.toJSON());
        return fromSource.type.id;
      });

      // the types do not all share one formatter, so the comparison above discriminates
      expect(new Set(ids)).toEqual(
        new Set(['string', 'number', 'relative_date', 'duration', 'boolean', 'ip', 'geo_point'])
      );
    });

    it('formats a date_nanos field by its Elasticsearch type, not as an ordinary date', async () => {
      const fieldFormats = buildFieldFormats();
      const dataView = buildDataView(fieldFormats);
      const source = await EsqlSource.create({ query: 'FROM logs-*', resultColumns: [] });
      const preciseTime = getTestField('precise_time');

      const ordinaryDate = source.getFormatter(getTestField('@timestamp'), fieldFormats);
      const nanosDate = source.getFormatter(preciseTime, fieldFormats);

      expect(ordinaryDate.type.id).toBe('relative_date');
      expect(nanosDate.type.id).toBe('duration');
      expect(nanosDate.toJSON()).toEqual(
        dataView.getFormatterForField(getDataViewField(dataView, preciseTime.name)).toJSON()
      );
    });

    it('formats a column of getColumns() by its Elasticsearch type', async () => {
      const fieldFormats = buildFieldFormats();
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [
          { id: '@timestamp', name: '@timestamp', meta: { type: 'date', esType: 'date' } },
          {
            id: 'precise_time',
            name: 'precise_time',
            meta: { type: 'date', esType: 'date_nanos' },
          },
        ],
      });
      const [date, nanosDate] = source.getColumns();

      expect(source.getFormatter(date, fieldFormats).type.id).toBe('relative_date');
      expect(source.getFormatter(nanosDate, fieldFormats).type.id).toBe('duration');
    });

    it('formats a field of source.fields and of the filterable source as they are', async () => {
      const fieldFormats = buildFieldFormats();
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [
          { id: 'bytes', name: 'bytes', meta: { type: 'number', esType: 'long' } },
          { id: 'host', name: 'host', meta: { type: 'string', esType: 'keyword' } },
        ],
      });
      const filterableSource = await source.toFilterableSource();

      expect(source.getFormatter(source.fields[0], fieldFormats).type.id).toBe('number');
      expect(source.getFormatter(source.fields[1], fieldFormats).type.id).toBe('string');
      expect(source.getFormatter(filterableSource.fields[0], fieldFormats).type.id).toBe('number');
    });

    it('does not apply the mapping default of a field, an ES|QL column has none', async () => {
      const fieldFormats = buildFieldFormats();
      const source = await EsqlSource.create({ query: 'FROM logs-*', resultColumns: [] });

      const formatter = source.getFormatter(
        { name: 'size', type: 'number', esTypes: ['long'], defaultFormatter: 'byte' },
        fieldFormats
      );

      expect(formatter.type.id).toBe('number');
    });

    it('differs from a data view that has a custom format for the field', async () => {
      const fieldFormats = buildFieldFormats();
      const dataView = buildDataView(fieldFormats, {
        fieldFormats: { bytes: { id: 'percent' } },
      });
      const source = await EsqlSource.create({ query: 'FROM logs-*', resultColumns: [] });
      const bytes = fieldsToTest[2];

      expect(dataView.getFormatterForField(getDataViewField(dataView, bytes.name)).type.id).toBe(
        'percent'
      );
      expect(source.getFormatter(bytes, fieldFormats).type.id).toBe('number');
    });
  });

  describe('of a data view source', () => {
    it('is the formatter of the data view, custom formats included', () => {
      const fieldFormats = buildFieldFormats();
      const dataView = buildDataView(fieldFormats, {
        fieldFormats: { bytes: { id: 'percent' } },
      });
      const source = new DataViewSource(dataView);

      fieldsToTest.forEach((field) => {
        expect(source.getFormatter(field).toJSON()).toEqual(
          dataView.getFormatterForField(getDataViewField(dataView, field.name)).toJSON()
        );
      });
      expect(source.getFormatter(fieldsToTest[2]).type.id).toBe('percent');
    });

    it('formats a column of getColumns() by its Elasticsearch type', () => {
      const source = new DataViewSource(buildDataView(buildFieldFormats()));
      const column = source.getColumns().find(({ name }) => name === 'precise_time');

      expect(column?.esType).toBe('date_nanos');
      expect(column && source.getFormatter(column).type.id).toBe('duration');
    });

    it('is the formatter of the data view for its own fields, as classes', () => {
      const fieldFormats = buildFieldFormats();
      const dataView = buildDataView(fieldFormats);
      const source = new DataViewSource(dataView);

      dataView.fields.getAll().forEach((field) => {
        expect(source.getFormatter(field).toJSON()).toEqual(
          dataView.getFormatterForField(field).toJSON()
        );
      });
    });

    it('honors the mapping default of a field', () => {
      const fieldFormats = buildFieldFormats();
      const source = new DataViewSource(buildDataView(fieldFormats));

      const formatter = source.getFormatter({
        name: 'size',
        type: 'number',
        esTypes: ['long'],
        defaultFormatter: 'byte',
      });

      expect(formatter.type.id).toBe('bytes');
    });
  });
});
