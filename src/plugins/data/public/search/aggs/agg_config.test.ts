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

import { identity } from 'lodash';

import { AggConfig, IAggConfig } from './agg_config';
import { AggConfigs, CreateAggConfigParams } from './agg_configs';
import { AggType } from './agg_type';
import { AggTypesRegistryStart } from './agg_types_registry';
import { mockDataServices, mockAggTypesRegistry } from './test_helpers';
import { Field as IndexPatternField, IndexPattern } from '../../index_patterns';
import { stubIndexPatternWithFields } from '../../../public/stubs';
import { dataPluginMock } from '../../../public/mocks';
import { setFieldFormats } from '../../../public/services';

describe('AggConfig', () => {
  let indexPattern: IndexPattern;
  let typesRegistry: AggTypesRegistryStart;

  beforeEach(() => {
    jest.restoreAllMocks();
    mockDataServices();
    indexPattern = stubIndexPatternWithFields as IndexPattern;
    typesRegistry = mockAggTypesRegistry();
  });

  describe('#toDsl', () => {
    it('calls #write()', () => {
      const ac = new AggConfigs(indexPattern, [], { typesRegistry });
      const configStates = {
        enabled: true,
        type: 'date_histogram',
        schema: 'segment',
        params: {},
      };
      const aggConfig = ac.createAggConfig(configStates);

      const spy = jest.spyOn(aggConfig, 'write').mockImplementation(() => ({ params: {} }));
      aggConfig.toDsl();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('uses the type name as the agg name', () => {
      const ac = new AggConfigs(indexPattern, [], { typesRegistry });
      const configStates = {
        enabled: true,
        type: 'date_histogram',
        schema: 'segment',
        params: {},
      };
      const aggConfig = ac.createAggConfig(configStates);

      jest.spyOn(aggConfig, 'write').mockImplementation(() => ({ params: {} }));
      const dsl = aggConfig.toDsl();
      expect(dsl).toHaveProperty('date_histogram');
    });

    it('uses the params from #write() output as the agg params', () => {
      const ac = new AggConfigs(indexPattern, [], { typesRegistry });
      const configStates = {
        enabled: true,
        type: 'date_histogram',
        schema: 'segment',
        params: {},
      };
      const aggConfig = ac.createAggConfig(configStates);

      const football = {};
      jest.spyOn(aggConfig, 'write').mockImplementation(() => ({ params: football }));
      const dsl = aggConfig.toDsl();
      expect(dsl.date_histogram).toBe(football);
    });

    it('includes subAggs from #write() output', () => {
      const configStates = [
        {
          enabled: true,
          type: 'avg',
          schema: 'metric',
          params: {},
        },
        {
          enabled: true,
          type: 'date_histogram',
          schema: 'segment',
          params: {},
        },
      ];
      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });

      const histoConfig = ac.byName('date_histogram')[0];
      const avgConfig = ac.byName('avg')[0];
      const football = {};

      jest
        .spyOn(histoConfig, 'write')
        .mockImplementation(() => ({ params: {}, subAggs: [avgConfig] }));
      jest.spyOn(avgConfig, 'write').mockImplementation(() => ({ params: football }));

      const dsl = histoConfig.toDsl();
      expect(dsl).toHaveProperty('aggs');
      expect(dsl.aggs).toHaveProperty(avgConfig.id);
      expect(dsl.aggs[avgConfig.id]).toHaveProperty('avg');
      expect(dsl.aggs[avgConfig.id].avg).toBe(football);
    });
  });

  describe('::ensureIds', () => {
    it('accepts an array of objects and assigns ids to them', () => {
      const objs = [{}, {}, {}, {}];
      AggConfig.ensureIds(objs);
      expect(objs[0]).toHaveProperty('id', '1');
      expect(objs[1]).toHaveProperty('id', '2');
      expect(objs[2]).toHaveProperty('id', '3');
      expect(objs[3]).toHaveProperty('id', '4');
    });

    it('assigns ids relative to the other only item in the list', () => {
      const objs = [{ id: '100' }, {}];
      AggConfig.ensureIds(objs);
      expect(objs[0]).toHaveProperty('id', '100');
      expect(objs[1]).toHaveProperty('id', '101');
    });

    it('assigns ids relative to the other items in the list', () => {
      const objs = [{ id: '100' }, { id: '200' }, { id: '500' }, { id: '350' }, {}];
      AggConfig.ensureIds(objs);
      expect(objs[0]).toHaveProperty('id', '100');
      expect(objs[1]).toHaveProperty('id', '200');
      expect(objs[2]).toHaveProperty('id', '500');
      expect(objs[3]).toHaveProperty('id', '350');
      expect(objs[4]).toHaveProperty('id', '501');
    });

    it('uses ::nextId to get the starting value', () => {
      jest.spyOn(AggConfig, 'nextId').mockImplementation(() => 534);
      const objs = AggConfig.ensureIds([{}]);
      expect(objs[0]).toHaveProperty('id', '534');
    });

    it('only calls ::nextId once', () => {
      const start = 420;
      const spy = jest.spyOn(AggConfig, 'nextId').mockImplementation(() => start);
      const objs = AggConfig.ensureIds([{}, {}, {}, {}, {}, {}, {}]);

      expect(spy).toHaveBeenCalledTimes(1);
      objs.forEach((obj, i) => {
        expect(obj).toHaveProperty('id', String(start + i));
      });
    });
  });

  describe('::nextId', () => {
    it('accepts a list of objects and picks the next id', () => {
      const next = AggConfig.nextId([{ id: '100' }, { id: '500' }] as IAggConfig[]);
      expect(next).toBe(501);
    });

    it('handles an empty list', () => {
      const next = AggConfig.nextId([]);
      expect(next).toBe(1);
    });

    it('fails when the list is not defined', () => {
      expect(() => {
        AggConfig.nextId((undefined as unknown) as IAggConfig[]);
      }).toThrowError();
    });
  });

  describe('#toJsonDataEquals', () => {
    const testsIdentical = [
      [
        {
          enabled: true,
          type: 'count',
          schema: 'metric',
          params: { field: '@timestamp' },
        },
      ],
      [
        {
          enabled: true,
          type: 'avg',
          schema: 'metric',
          params: {},
        },
        {
          enabled: true,
          type: 'date_histogram',
          schema: 'segment',
          params: {},
        },
      ],
    ];

    testsIdentical.forEach((configState, index) => {
      it(`identical aggregations (${index})`, () => {
        const ac1 = new AggConfigs(indexPattern, configState, { typesRegistry });
        const ac2 = new AggConfigs(indexPattern, configState, { typesRegistry });
        expect(ac1.jsonDataEquals(ac2.aggs)).toBe(true);
      });
    });

    const testsIdenticalDifferentOrder = [
      {
        config1: [
          {
            enabled: true,
            type: 'avg',
            schema: 'metric',
            params: {},
          },
          {
            enabled: true,
            type: 'date_histogram',
            schema: 'segment',
            params: {},
          },
        ],
        config2: [
          {
            enabled: true,
            schema: 'metric',
            type: 'avg',
            params: {},
          },
          {
            enabled: true,
            schema: 'segment',
            type: 'date_histogram',
            params: {},
          },
        ],
      },
    ];

    testsIdenticalDifferentOrder.forEach((test, index) => {
      it(`identical aggregations (${index}) - init json is in different order`, () => {
        const ac1 = new AggConfigs(indexPattern, test.config1, { typesRegistry });
        const ac2 = new AggConfigs(indexPattern, test.config2, { typesRegistry });
        expect(ac1.jsonDataEquals(ac2.aggs)).toBe(true);
      });
    });

    const testsDifferent = [
      {
        config1: [
          {
            enabled: true,
            type: 'avg',
            schema: 'metric',
            params: {},
          },
          {
            enabled: true,
            type: 'date_histogram',
            schema: 'segment',
            params: {},
          },
        ],
        config2: [
          {
            enabled: true,
            type: 'max',
            schema: 'metric',
            params: {},
          },
          {
            enabled: true,
            type: 'date_histogram',
            schema: 'segment',
            params: {},
          },
        ],
      },
      {
        config1: [
          {
            enabled: true,
            type: 'count',
            schema: 'metric',
            params: { field: '@timestamp' },
          },
        ],
        config2: [
          {
            enabled: true,
            type: 'count',
            schema: 'metric',
            params: { field: '@timestamp' },
          },
          {
            enabled: true,
            type: 'date_histogram',
            schema: 'segment',
            params: {},
          },
        ],
      },
    ];

    testsDifferent.forEach((test, index) => {
      it(`different aggregations (${index})`, () => {
        const ac1 = new AggConfigs(indexPattern, test.config1, { typesRegistry });
        const ac2 = new AggConfigs(indexPattern, test.config2, { typesRegistry });
        expect(ac1.jsonDataEquals(ac2.aggs)).toBe(false);
      });
    });
  });

  describe('#toJSON', () => {
    it('includes the aggs id, params, type and schema', () => {
      const ac = new AggConfigs(indexPattern, [], { typesRegistry });
      const configStates = {
        enabled: true,
        type: 'date_histogram',
        schema: 'segment',
        params: {},
      };
      const aggConfig = ac.createAggConfig(configStates);

      expect(aggConfig.id).toBe('1');
      expect(typeof aggConfig.params).toBe('object');
      expect(aggConfig.type).toBeInstanceOf(AggType);
      expect(aggConfig.type).toHaveProperty('name', 'date_histogram');
      expect(typeof aggConfig.schema).toBe('string');

      const state = aggConfig.toJSON();
      expect(state).toHaveProperty('id', '1');
      expect(typeof state.params).toBe('object');
      expect(state).toHaveProperty('type', 'date_histogram');
      expect(state).toHaveProperty('schema', 'segment');
    });

    it('test serialization  order is identical (for visual consistency)', () => {
      const configStates = [
        {
          enabled: true,
          type: 'date_histogram',
          schema: 'segment',
          params: {},
        },
      ];
      const ac1 = new AggConfigs(indexPattern, configStates, { typesRegistry });
      const ac2 = new AggConfigs(indexPattern, configStates, { typesRegistry });

      // this relies on the assumption that js-engines consistently loop over properties in insertion order.
      // most likely the case, but strictly speaking not guaranteed by the JS and JSON specifications.
      expect(JSON.stringify(ac1.aggs) === JSON.stringify(ac2.aggs)).toBe(true);
    });
  });

  describe('#makeLabel', () => {
    let aggConfig: AggConfig;

    beforeEach(() => {
      const ac = new AggConfigs(indexPattern, [], { typesRegistry });
      aggConfig = ac.createAggConfig({ type: 'count' } as CreateAggConfigParams);
    });

    it('uses the custom label if it is defined', () => {
      aggConfig.params.customLabel = 'Custom label';
      const label = aggConfig.makeLabel();
      expect(label).toBe(aggConfig.params.customLabel);
    });

    it('default label should be "Count"', () => {
      const label = aggConfig.makeLabel();
      expect(label).toBe('Count');
    });

    it('default label should be "Percentage of Count" when percentageMode is set to true', () => {
      const label = aggConfig.makeLabel(true);
      expect(label).toBe('Percentage of Count');
    });

    it('empty label if the type is not defined', () => {
      aggConfig.type = (undefined as unknown) as AggType;
      const label = aggConfig.makeLabel();
      expect(label).toBe('');
    });
  });

  describe('#fieldFormatter - custom getFormat handler', () => {
    it('returns formatter from getFormat handler', () => {
      setFieldFormats({
        ...dataPluginMock.createStartContract().fieldFormats,
        getDefaultInstance: jest.fn().mockImplementation(() => ({
          getConverterFor: jest.fn().mockImplementation(() => (t: string) => t),
        })) as any,
      });

      const ac = new AggConfigs(indexPattern, [], { typesRegistry });
      const configStates = {
        enabled: true,
        type: 'count',
        schema: 'metric',
        params: { field: '@timestamp' },
      };
      const aggConfig = ac.createAggConfig(configStates);

      const fieldFormatter = aggConfig.fieldFormatter();
      expect(fieldFormatter).toBeDefined();
      expect(fieldFormatter('text')).toBe('text');
    });
  });

  // TODO: Converting these field formatter tests from browser tests to unit
  // tests makes them much less helpful due to the extensive use of mocking.
  // We should revisit these and rewrite them into something more useful.
  describe('#fieldFormatter - no custom getFormat handler', () => {
    let aggConfig: AggConfig;

    beforeEach(() => {
      setFieldFormats({
        ...dataPluginMock.createStartContract().fieldFormats,
        getDefaultInstance: jest.fn().mockImplementation(() => ({
          getConverterFor: (t?: string) => t || identity,
        })) as any,
      });
      indexPattern.fields.getByName = (name) =>
        ({
          format: {
            getConverterFor: (t?: string) => t || identity,
          },
        } as IndexPatternField);

      const configStates = {
        enabled: true,
        type: 'histogram',
        schema: 'bucket',
        params: {
          field: {
            format: {
              getConverterFor: (t?: string) => t || identity,
            },
          },
        },
      };
      const ac = new AggConfigs(indexPattern, [configStates], { typesRegistry });
      aggConfig = ac.createAggConfig(configStates);
    });

    it("returns the field's formatter", () => {
      expect(aggConfig.fieldFormatter().toString()).toBe(
        aggConfig.getField().format.getConverterFor().toString()
      );
    });

    it('returns the string format if the field does not have a format', () => {
      const agg = aggConfig;
      agg.params.field = { type: 'number', format: null };
      const fieldFormatter = agg.fieldFormatter();
      expect(fieldFormatter).toBeDefined();
      expect(fieldFormatter('text')).toBe('text');
    });

    it('returns the string format if there is no field', () => {
      const agg = aggConfig;
      delete agg.params.field;
      const fieldFormatter = agg.fieldFormatter();
      expect(fieldFormatter).toBeDefined();
      expect(fieldFormatter('text')).toBe('text');
    });

    it('returns the html converter if "html" is passed in', () => {
      const field = indexPattern.fields.getByName('bytes');
      expect(aggConfig.fieldFormatter('html').toString()).toBe(
        field!.format.getConverterFor('html').toString()
      );
    });
  });
});
