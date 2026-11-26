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

// The date formatters are registered by the plugin, not by `baseFormatters`, so dates map to another one
const defaultTypeMap = {
  ip: { id: 'ip', params: {} },
  date: { id: 'relative_date', params: {} },
  date_nanos: { id: 'relative_date', params: {} },
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
].map((field) => ({ ...field, searchable: true, aggregatable: false }));

const buildDataView = (
  fieldFormats: FieldFormatsRegistry,
  spec: Partial<DataViewSpec> = {}
): DataView =>
  new DataView({
    fieldFormats,
    spec: {
      id: 'logs',
      title: 'logs-*',
      fields: Object.fromEntries(fieldsToTest.map((field) => [field.name, field])),
      ...spec,
    },
  });

describe('getFormatter', () => {
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
        const fromDataView = dataView.getFormatterForField(field);
        const fromSource = source.getFormatter(field, fieldFormats);

        expect(fromSource.toJSON()).toEqual(fromDataView.toJSON());
        return fromSource.type.id;
      });

      // the types do not all share one formatter, so the comparison above discriminates
      expect(new Set(ids)).toEqual(
        new Set(['string', 'number', 'relative_date', 'boolean', 'ip', 'geo_point'])
      );
    });

    it('differs from a data view that has a custom format for the field', async () => {
      const fieldFormats = buildFieldFormats();
      const dataView = buildDataView(fieldFormats, {
        fieldFormats: { bytes: { id: 'percent' } },
      });
      const source = await EsqlSource.create({ query: 'FROM logs-*', resultColumns: [] });
      const bytes = fieldsToTest[2];

      expect(dataView.getFormatterForField(bytes).type.id).toBe('percent');
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
          dataView.getFormatterForField(field).toJSON()
        );
      });
      expect(source.getFormatter(fieldsToTest[2]).type.id).toBe('percent');
    });
  });
});
