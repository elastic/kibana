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

import { AggType, AggTypeConfig } from './agg_type';
import { AggConfig } from './agg_config';
import { npStart } from 'ui/new_platform';

jest.mock('ui/new_platform');

describe('AggType Class', () => {
  describe('constructor', () => {
    it("requires a valid config object as it's first param", () => {
      expect(() => {
        const aggConfig: AggTypeConfig = (undefined as unknown) as AggTypeConfig;
        new AggType(aggConfig);
      }).toThrowError();
    });

    describe('application of config properties', () => {
      it('assigns the config value to itself', () => {
        const config: AggTypeConfig = {
          name: 'name',
          title: 'title',
        };

        const aggType = new AggType(config);

        expect(aggType.name).toBe('name');
        expect(aggType.title).toBe('title');
      });

      describe('makeLabel', () => {
        it('makes a function when the makeLabel config is not specified', () => {
          const makeLabel = () => 'label';
          const aggConfig = {} as AggConfig;
          const config: AggTypeConfig = {
            name: 'name',
            title: 'title',
            makeLabel,
          };

          const aggType = new AggType(config);

          expect(aggType.makeLabel).toBe(makeLabel);
          expect(aggType.makeLabel(aggConfig)).toBe('label');
        });
      });

      describe('getResponseAggs/getRequestAggs', () => {
        it('copies the value', () => {
          const testConfig = (aggConfig: AggConfig) => [aggConfig];

          const aggType = new AggType({
            name: 'name',
            title: 'title',
            getResponseAggs: testConfig,
            getRequestAggs: testConfig,
          });

          expect(aggType.getResponseAggs).toBe(testConfig);
          expect(aggType.getResponseAggs).toBe(testConfig);
        });

        it('defaults to noop', () => {
          const aggConfig = {} as AggConfig;
          const aggType = new AggType({
            name: 'name',
            title: 'title',
          });
          const responseAggs = aggType.getRequestAggs(aggConfig);

          expect(responseAggs).toBe(undefined);
        });
      });

      describe('params', () => {
        it('defaults to AggParams object with JSON param', () => {
          const aggType = new AggType({
            name: 'smart agg',
            title: 'title',
          });

          expect(Array.isArray(aggType.params)).toBeTruthy();
          expect(aggType.params.length).toBe(2);
          expect(aggType.params[0].name).toBe('json');
          expect(aggType.params[1].name).toBe('customLabel');
        });

        it('can disable customLabel', () => {
          const aggType = new AggType({
            name: 'smart agg',
            title: 'title',
            customLabels: false,
          });

          expect(aggType.params.length).toBe(1);
          expect(aggType.params[0].name).toBe('json');
        });

        it('passes the params arg directly to the AggParams constructor', () => {
          const params = [{ name: 'one' }, { name: 'two' }];
          const paramLength = params.length + 2; // json and custom label are always appended

          const aggType = new AggType({
            name: 'bucketeer',
            title: 'title',
            params,
          });

          expect(Array.isArray(aggType.params)).toBeTruthy();
          expect(aggType.params.length).toBe(paramLength);
        });
      });
    });

    describe('getFormat', function() {
      let aggConfig: AggConfig;
      let field: any;

      beforeEach(() => {
        aggConfig = ({
          getField: jest.fn(() => field),
        } as unknown) as AggConfig;
      });

      it('returns the formatter for the aggConfig', () => {
        const aggType = new AggType({
          name: 'name',
          title: 'title',
        });

        field = {
          format: 'format',
        };

        expect(aggType.getFormat(aggConfig)).toBe('format');
      });

      it('returns default formatter', () => {
        npStart.plugins.data.fieldFormats.getDefaultInstance = jest.fn(() => 'default') as any;

        const aggType = new AggType({
          name: 'name',
          title: 'title',
        });

        field = undefined;

        expect(aggType.getFormat(aggConfig)).toBe('default');
      });
    });
  });
});
