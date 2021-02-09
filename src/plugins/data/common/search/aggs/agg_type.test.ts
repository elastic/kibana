/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggType, AggTypeConfig } from './agg_type';
import { IAggConfig } from './agg_config';

describe('AggType Class', () => {
  describe('constructor', () => {
    test("requires a valid config object as it's first param", () => {
      expect(() => {
        const aggConfig: AggTypeConfig = (undefined as unknown) as AggTypeConfig;
        new AggType(aggConfig);
      }).toThrowError();
    });

    describe('application of config properties', () => {
      test('assigns the config value to itself', () => {
        const config: AggTypeConfig = {
          name: 'name',
          expressionName: 'aggName',
          title: 'title',
        };

        const aggType = new AggType(config);

        expect(aggType.name).toBe('name');
        expect(aggType.title).toBe('title');
      });

      describe('makeLabel', () => {
        test('makes a function when the makeLabel config is not specified', () => {
          const makeLabel = () => 'label';
          const aggConfig = {} as IAggConfig;
          const config: AggTypeConfig = {
            name: 'name',
            expressionName: 'aggName',
            title: 'title',
            makeLabel,
          };

          const aggType = new AggType(config);

          expect(aggType.makeLabel).toBe(makeLabel);
          expect(aggType.makeLabel(aggConfig)).toBe('label');
        });
      });

      describe('getResponseAggs/getRequestAggs', () => {
        test('copies the value', () => {
          const testConfig = (aggConfig: IAggConfig) => [aggConfig];

          const aggType = new AggType({
            name: 'name',
            expressionName: 'aggName',
            title: 'title',
            getResponseAggs: testConfig,
            getRequestAggs: testConfig,
          });

          expect(aggType.getResponseAggs).toBe(testConfig);
          expect(aggType.getResponseAggs).toBe(testConfig);
        });

        test('defaults to noop', () => {
          const aggConfig = {} as IAggConfig;
          const aggType = new AggType({
            name: 'name',
            expressionName: 'aggName',
            title: 'title',
          });
          const responseAggs = aggType.getRequestAggs(aggConfig);

          expect(responseAggs).toBe(undefined);
        });
      });

      describe('params', () => {
        test('defaults to AggParams object with JSON param', () => {
          const aggType = new AggType({
            name: 'smart agg',
            expressionName: 'aggSmart',
            title: 'title',
          });

          expect(Array.isArray(aggType.params)).toBeTruthy();
          expect(aggType.params.length).toBe(2);
          expect(aggType.params[0].name).toBe('json');
          expect(aggType.params[1].name).toBe('customLabel');
        });

        test('disables json param', () => {
          const aggType = new AggType({
            name: 'name',
            expressionName: 'aggName',
            title: 'title',
            json: false,
          });

          expect(aggType.params.length).toBe(1);
          expect(aggType.params[0].name).toBe('customLabel');
        });

        test('can disable customLabel', () => {
          const aggType = new AggType({
            name: 'smart agg',
            expressionName: 'aggSmart',
            title: 'title',
            customLabels: false,
          });

          expect(aggType.params.length).toBe(1);
          expect(aggType.params[0].name).toBe('json');
        });

        test('passes the params arg directly to the AggParams constructor', () => {
          const params = [{ name: 'one' }, { name: 'two' }];
          const paramLength = params.length + 2; // json and custom label are always appended

          const aggType = new AggType({
            name: 'bucketeer',
            expressionName: 'aggBucketeer',
            title: 'title',
            params,
          });

          expect(Array.isArray(aggType.params)).toBeTruthy();
          expect(aggType.params.length).toBe(paramLength);
        });
      });
    });

    describe('getSerializedFormat', () => {
      test('returns the default serialized field format if it exists', () => {
        const aggConfig = ({
          params: {
            field: {
              format: {
                toJSON: () => ({ id: 'format' }),
              },
            },
          },
          aggConfigs: {
            indexPattern: { getFormatterForField: () => ({ toJSON: () => ({ id: 'format' }) }) },
          },
        } as unknown) as IAggConfig;
        const aggType = new AggType({
          name: 'name',
          expressionName: 'aggName',
          title: 'title',
        });
        expect(aggType.getSerializedFormat(aggConfig)).toMatchInlineSnapshot(`
          Object {
            "id": "format",
          }
        `);
      });

      test('returns an empty object if a field param does not exist', () => {
        const aggConfig = ({
          params: {},
        } as unknown) as IAggConfig;
        const aggType = new AggType({
          name: 'name',
          expressionName: 'aggName',
          title: 'title',
        });
        expect(aggType.getSerializedFormat(aggConfig)).toMatchInlineSnapshot(`Object {}`);
      });

      test('uses a custom getSerializedFormat function if defined', () => {
        const aggConfig = ({
          params: {
            field: {
              format: {
                toJSON: () => ({ id: 'format' }),
              },
            },
          },
        } as unknown) as IAggConfig;
        const getSerializedFormat = jest.fn().mockReturnValue({ id: 'hello' });
        const aggType = new AggType({
          name: 'name',
          expressionName: 'aggName',
          title: 'title',
          getSerializedFormat,
        });
        const serialized = aggType.getSerializedFormat(aggConfig);
        expect(getSerializedFormat).toHaveBeenCalledWith(aggConfig);
        expect(serialized).toMatchInlineSnapshot(`
          Object {
            "id": "hello",
          }
        `);
      });
    });
  });
});
