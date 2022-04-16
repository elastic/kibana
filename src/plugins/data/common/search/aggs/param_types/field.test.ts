/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BaseParamType } from './base';
import { FieldParamType } from './field';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '../../..';
import { IAggConfig } from '../agg_config';

describe('Field', () => {
  const indexPattern = {
    id: '1234',
    title: 'logstash-*',
    fields: [
      {
        name: 'field1',
        type: KBN_FIELD_TYPES.NUMBER,
        esTypes: [ES_FIELD_TYPES.INTEGER],
        aggregatable: true,
        filterable: true,
        searchable: true,
      },
      {
        name: 'field2',
        type: KBN_FIELD_TYPES.STRING,
        esTypes: [ES_FIELD_TYPES.TEXT],
        aggregatable: false,
        filterable: false,
        searchable: true,
      },
    ],
  };

  const agg = {
    getIndexPattern: jest.fn(() => indexPattern),
  } as unknown as IAggConfig;

  describe('constructor', () => {
    it('it is an instance of BaseParamType', () => {
      const aggParam = new FieldParamType({
        name: 'field',
        type: 'field',
      });

      expect(aggParam instanceof BaseParamType).toBeTruthy();
    });
  });

  describe('getAvailableFields', () => {
    it('should return only aggregatable fields by default', () => {
      const aggParam = new FieldParamType({
        name: 'field',
        type: 'field',
      });

      const fields = aggParam.getAvailableFields(agg);

      expect(fields.length).toBe(1);

      for (const field of fields) {
        expect(field.aggregatable).toBe(true);
      }
    });

    it('should return all fields if onlyAggregatable is false', () => {
      const aggParam = new FieldParamType({
        name: 'field',
        type: 'field',
      });

      aggParam.onlyAggregatable = false;

      const fields = aggParam.getAvailableFields(agg);

      expect(fields.length).toBe(2);
    });

    it('should return all fields if filterFieldTypes was not specified', () => {
      const aggParam = new FieldParamType({
        name: 'field',
        type: 'field',
      });

      indexPattern.fields[1].aggregatable = true;

      const fields = aggParam.getAvailableFields(agg);

      expect(fields.length).toBe(2);
    });

    it('should filter by KBN type', () => {
      const aggParam = new FieldParamType({
        name: 'field',
        type: 'field',
        filterFieldTypes: KBN_FIELD_TYPES.NUMBER,
      });

      const fields = aggParam.getAvailableFields(agg);

      expect(fields.length).toBe(1);
      expect(fields[0]).toBe(indexPattern.fields[0]);
    });

    it('should filter by field filter predicate', () => {
      const aggParam = new FieldParamType({
        name: 'field',
        type: 'field',
        filterField: (field: typeof indexPattern['fields'][0]) =>
          field.esTypes?.includes(ES_FIELD_TYPES.TEXT),
      });

      const fields = aggParam.getAvailableFields(agg);

      expect(fields.length).toBe(1);
      expect(fields[0]).toBe(indexPattern.fields[1]);
    });

    it('should filter by field filter predicate and ignore other filter settings', () => {
      const aggParam = new FieldParamType({
        name: 'field',
        type: 'field',
        filterField: (field: typeof indexPattern['fields'][0]) =>
          field.esTypes?.includes(ES_FIELD_TYPES.TEXT),
        filterFieldTypes: KBN_FIELD_TYPES.NUMBER,
      });

      const fields = aggParam.getAvailableFields(agg);

      expect(fields.length).toBe(1);
      expect(fields[0]).toBe(indexPattern.fields[1]);
    });
  });
});
