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

import { bucketTransform } from './bucket_transform';

describe('src/legacy/core_plugins/metrics/server/lib/vis_data/helpers/bucket_transform.js', () => {
  describe('bucketTransform', () => {
    let bucket;
    let metrics;

    beforeEach(() => {
      bucket = {
        model_type: 'holt_winters',
        alpha: 0.6,
        beta: 0.3,
        gamma: 0.3,
        period: 1,
        multiplicative: true,
        window: 10,
        field: '61ca57f2-469d-11e7-af02-69e470af7417',
        id: 'e815ae00-7881-11e9-9392-cbca66a4cf76',
        type: 'moving_average',
      };
      metrics = [
        {
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          numerator: 'FlightDelay:true',
          type: 'count',
        },
        {
          model_type: 'holt_winters',
          alpha: 0.6,
          beta: 0.3,
          gamma: 0.3,
          period: 1,
          multiplicative: true,
          window: 10,
          field: '61ca57f2-469d-11e7-af02-69e470af7417',
          id: 'e815ae00-7881-11e9-9392-cbca66a4cf76',
          type: 'moving_average',
        },
      ];
    });

    describe('moving_average', () => {
      test('should return a moving function aggregation API and match a snapshot', () => {
        expect(bucketTransform.moving_average(bucket, metrics)).toMatchSnapshot();
      });
    });

    describe('static', () => {
      test('should return a script with a double value when using decimals', () => {
        expect(bucketTransform.static({ value: '421.12' })).toHaveProperty(
          'bucket_script.script.source',
          '421.12'
        );
      });

      test('should return a long script for integer values', () => {
        expect(bucketTransform.static({ value: '1234567890123' })).toHaveProperty(
          'bucket_script.script.source',
          '1234567890123L'
        );
      });

      test('should not return a long script for exponential values', () => {
        expect(bucketTransform.static({ value: '123123123e12' })).toHaveProperty(
          'bucket_script.script.source',
          '123123123e12'
        );
      });

      test('should return decimal scripts for very large decimals', () => {
        expect(bucketTransform.static({ value: '1234178312312381273123123.11123' })).toHaveProperty(
          'bucket_script.script.source',
          '1234178312312381273123123.11123'
        );
      });
    });
  });
});
