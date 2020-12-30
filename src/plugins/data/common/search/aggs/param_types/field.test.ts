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

import { BaseParamType } from './base';
import { FieldParamType } from './field';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '../../../../common';
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

  const agg = ({
    getIndexPattern: jest.fn(() => indexPattern),
  } as unknown) as IAggConfig;

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
  });
});
