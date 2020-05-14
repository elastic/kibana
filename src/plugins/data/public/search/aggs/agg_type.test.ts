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

import { AggType, AggTypeConfig, AggTypeDependencies } from './agg_type';
import { IAggConfig } from './agg_config';
import { fieldFormatsServiceMock } from '../../field_formats/mocks';
import { notificationServiceMock } from '../../../../../../src/core/public/mocks';
import { InternalStartServices } from '../../types';

describe('AggType Class', () => {
  let dependencies: AggTypeDependencies;

  beforeEach(() => {
    dependencies = {
      getInternalStartServices: () =>
        (({
          fieldFormats: {
            ...fieldFormatsServiceMock.createStartContract(),
            getDefaultInstance: jest.fn(() => 'default') as any,
          },
          notifications: notificationServiceMock.createStartContract(),
        } as unknown) as InternalStartServices),
    };
  });

  describe('constructor', () => {
    test("requires a valid config object as it's first param", () => {
      expect(() => {
        const aggConfig: AggTypeConfig = (undefined as unknown) as AggTypeConfig;
        new AggType(aggConfig, dependencies);
      }).toThrowError();
    });

    describe('application of config properties', () => {
      test('assigns the config value to itself', () => {
        const config: AggTypeConfig = {
          name: 'name',
          title: 'title',
        };

        const aggType = new AggType(config, dependencies);

        expect(aggType.name).toBe('name');
        expect(aggType.title).toBe('title');
      });

      describe('makeLabel', () => {
        test('makes a function when the makeLabel config is not specified', () => {
          const makeLabel = () => 'label';
          const aggConfig = {} as IAggConfig;
          const config: AggTypeConfig = {
            name: 'name',
            title: 'title',
            makeLabel,
          };

          const aggType = new AggType(config, dependencies);

          expect(aggType.makeLabel).toBe(makeLabel);
          expect(aggType.makeLabel(aggConfig)).toBe('label');
        });
      });

      describe('getResponseAggs/getRequestAggs', () => {
        test('copies the value', () => {
          const testConfig = (aggConfig: IAggConfig) => [aggConfig];

          const aggType = new AggType(
            {
              name: 'name',
              title: 'title',
              getResponseAggs: testConfig,
              getRequestAggs: testConfig,
            },
            dependencies
          );

          expect(aggType.getResponseAggs).toBe(testConfig);
          expect(aggType.getResponseAggs).toBe(testConfig);
        });

        test('defaults to noop', () => {
          const aggConfig = {} as IAggConfig;
          const aggType = new AggType(
            {
              name: 'name',
              title: 'title',
            },
            dependencies
          );
          const responseAggs = aggType.getRequestAggs(aggConfig);

          expect(responseAggs).toBe(undefined);
        });
      });

      describe('params', () => {
        test('defaults to AggParams object with JSON param', () => {
          const aggType = new AggType(
            {
              name: 'smart agg',
              title: 'title',
            },
            dependencies
          );

          expect(Array.isArray(aggType.params)).toBeTruthy();
          expect(aggType.params.length).toBe(2);
          expect(aggType.params[0].name).toBe('json');
          expect(aggType.params[1].name).toBe('customLabel');
        });

        test('can disable customLabel', () => {
          const aggType = new AggType(
            {
              name: 'smart agg',
              title: 'title',
              customLabels: false,
            },
            dependencies
          );

          expect(aggType.params.length).toBe(1);
          expect(aggType.params[0].name).toBe('json');
        });

        test('passes the params arg directly to the AggParams constructor', () => {
          const params = [{ name: 'one' }, { name: 'two' }];
          const paramLength = params.length + 2; // json and custom label are always appended

          const aggType = new AggType(
            {
              name: 'bucketeer',
              title: 'title',
              params,
            },
            dependencies
          );

          expect(Array.isArray(aggType.params)).toBeTruthy();
          expect(aggType.params.length).toBe(paramLength);
        });
      });
    });

    describe('getFormat', function() {
      let aggConfig: IAggConfig;
      let field: any;

      beforeEach(() => {
        aggConfig = ({
          getField: jest.fn(() => field),
        } as unknown) as IAggConfig;
      });

      test('returns the formatter for the aggConfig', () => {
        const aggType = new AggType(
          {
            name: 'name',
            title: 'title',
          },
          dependencies
        );

        field = {
          format: 'format',
        };

        expect(aggType.getFormat(aggConfig)).toBe('format');
      });

      test('returns default formatter', () => {
        const aggType = new AggType(
          {
            name: 'name',
            title: 'title',
          },
          dependencies
        );

        field = undefined;

        expect(aggType.getFormat(aggConfig)).toBe('default');
      });
    });
  });
});
