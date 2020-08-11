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
import { mockAggTypesRegistry } from './test_helpers';
import { MetricAggType } from './metrics/metric_agg_type';
import { IndexPattern, IIndexPatternFieldList } from '../../index_patterns';

describe('AggConfig', () => {
  let indexPattern: IndexPattern;
  let typesRegistry: AggTypesRegistryStart;
  const fields = [
    {
      name: '@timestamp',
      type: 'date',
      aggregatable: true,
      format: {
        toJSON: () => ({}),
      },
    },
    {
      name: 'bytes',
      type: 'number',
      aggregatable: true,
      format: {
        toJSON: () => ({}),
      },
    },
    {
      name: 'machine.os.keyword',
      type: 'string',
      aggregatable: true,
      format: {
        toJSON: () => ({}),
      },
    },
  ];

  beforeEach(() => {
    jest.restoreAllMocks();
    indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: ({
        getByName: (name: string) => fields.find((f) => f.name === name),
        filter: () => fields,
      } as unknown) as IndexPattern['fields'],
    } as IndexPattern;
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

  describe('#serialize', () => {
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

      const state = aggConfig.serialize();
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

  describe('#toSerializedFieldFormat', () => {
    beforeEach(() => {
      indexPattern.fields.getByName = identity as IIndexPatternFieldList['getByName'];
    });

    it('works with aggs that have a special format type', () => {
      const configStates = [
        {
          type: 'count',
          params: {},
        },
        {
          type: 'date_histogram',
          params: { field: '@timestamp' },
        },
        {
          type: 'terms',
          params: { field: 'machine.os.keyword' },
        },
      ];
      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });

      expect(ac.aggs.map((agg) => agg.toSerializedFieldFormat())).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "number",
          },
          Object {
            "id": "date",
            "params": Object {
              "pattern": "HH:mm:ss.SSS",
            },
          },
          Object {
            "id": "terms",
            "params": Object {
              "id": undefined,
              "missingBucketLabel": "Missing",
              "otherBucketLabel": "Other",
            },
          },
        ]
      `);
    });

    it('works with pipeline aggs', () => {
      const configStates = [
        {
          type: 'max_bucket',
          params: {
            customMetric: {
              type: 'cardinality',
              params: {
                field: 'bytes',
              },
            },
          },
        },
        {
          type: 'cumulative_sum',
          params: {
            buckets_path: '1',
            customMetric: {
              type: 'cardinality',
              params: {
                field: 'bytes',
              },
            },
          },
        },
        {
          type: 'percentile_ranks',
          id: 'myMetricAgg',
          params: {},
        },
        {
          type: 'cumulative_sum',
          params: {
            metricAgg: 'myMetricAgg',
          },
        },
      ];
      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });

      expect(ac.aggs.map((agg) => agg.toSerializedFieldFormat())).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "number",
          },
          Object {
            "id": "number",
          },
          Object {
            "id": "percent",
          },
          Object {
            "id": "percent",
          },
        ]
      `);
    });
  });

  describe('#toExpressionAst', () => {
    it('works with primitive param types', () => {
      const ac = new AggConfigs(indexPattern, [], { typesRegistry });
      const configStates = {
        enabled: true,
        type: 'terms',
        schema: 'segment',
        params: {
          field: 'machine.os.keyword',
          order: 'asc',
        },
      };
      const aggConfig = ac.createAggConfig(configStates);
      expect(aggConfig.toExpressionAst()).toMatchInlineSnapshot(`
        Object {
          "arguments": Object {
            "enabled": Array [
              true,
            ],
            "field": Array [
              "machine.os.keyword",
            ],
            "id": Array [
              "1",
            ],
            "missingBucket": Array [
              false,
            ],
            "missingBucketLabel": Array [
              "Missing",
            ],
            "order": Array [
              "asc",
            ],
            "otherBucket": Array [
              false,
            ],
            "otherBucketLabel": Array [
              "Other",
            ],
            "schema": Array [
              "segment",
            ],
            "size": Array [
              5,
            ],
          },
          "function": "aggTerms",
          "type": "function",
        }
      `);
    });

    it('creates a subexpression for params of type "agg"', () => {
      const ac = new AggConfigs(indexPattern, [], { typesRegistry });
      const configStates = {
        type: 'terms',
        params: {
          field: 'machine.os.keyword',
          order: 'asc',
          orderAgg: {
            enabled: true,
            type: 'terms',
            params: {
              field: 'bytes',
              order: 'asc',
              size: 5,
            },
          },
        },
      };
      const aggConfig = ac.createAggConfig(configStates);
      const aggArg = aggConfig.toExpressionAst()?.arguments.orderAgg;
      expect(aggArg).toMatchInlineSnapshot(`
        Array [
          Object {
            "chain": Array [
              Object {
                "arguments": Object {
                  "enabled": Array [
                    true,
                  ],
                  "field": Array [
                    "bytes",
                  ],
                  "id": Array [
                    "1-orderAgg",
                  ],
                  "missingBucket": Array [
                    false,
                  ],
                  "missingBucketLabel": Array [
                    "Missing",
                  ],
                  "order": Array [
                    "asc",
                  ],
                  "otherBucket": Array [
                    false,
                  ],
                  "otherBucketLabel": Array [
                    "Other",
                  ],
                  "schema": Array [
                    "orderAgg",
                  ],
                  "size": Array [
                    5,
                  ],
                },
                "function": "aggTerms",
                "type": "function",
              },
            ],
            "type": "expression",
          },
        ]
      `);
    });

    it('creates a subexpression for param types other than "agg" which have specified toExpressionAst', () => {
      // Overwrite the `ranges` param in the `range` agg with a mock toExpressionAst function
      const range: MetricAggType = typesRegistry.get('range');
      range.expressionName = 'aggRange';
      const rangesParam = range.params.find((p) => p.name === 'ranges');
      rangesParam!.toExpressionAst = (val: any) => ({
        type: 'function',
        function: 'aggRanges',
        arguments: {
          ranges: ['oh hi there!'],
        },
      });

      const ac = new AggConfigs(indexPattern, [], { typesRegistry });
      const configStates = {
        type: 'range',
        params: {
          field: 'bytes',
        },
      };

      const aggConfig = ac.createAggConfig(configStates);
      const ranges = aggConfig.toExpressionAst()!.arguments.ranges;
      expect(ranges).toMatchInlineSnapshot(`
        Array [
          Object {
            "chain": Array [
              Object {
                "arguments": Object {
                  "ranges": Array [
                    "oh hi there!",
                  ],
                },
                "function": "aggRanges",
                "type": "function",
              },
            ],
            "type": "expression",
          },
        ]
      `);
    });

    it('stringifies any other params which are an object', () => {
      const ac = new AggConfigs(indexPattern, [], { typesRegistry });
      const configStates = {
        type: 'terms',
        params: {
          field: 'machine.os.keyword',
          order: 'asc',
          json: { foo: 'bar' },
        },
      };
      const aggConfig = ac.createAggConfig(configStates);
      const json = aggConfig.toExpressionAst()?.arguments.json;
      expect(json).toEqual([JSON.stringify(configStates.params.json)]);
    });

    it(`returns undefined if an expressionName doesn't exist on the agg type`, () => {
      const ac = new AggConfigs(indexPattern, [], { typesRegistry });
      const configStates = {
        type: 'unknown type',
        params: {},
      };
      const aggConfig = ac.createAggConfig(configStates);
      expect(aggConfig.toExpressionAst()).toBe(undefined);
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
});
