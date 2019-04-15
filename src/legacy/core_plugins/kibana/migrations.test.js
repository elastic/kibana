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

import { migrations } from './migrations';

describe('visualization', () => {
  describe('date histogram time zone removal', () => {
    const migrate = doc => migrations.visualization['6.7.2'](doc);
    let doc;
    beforeEach(() => {
      doc = {
        attributes: {
          visState: JSON.stringify({
            aggs: [
              {
                'enabled': true,
                'id': '1',
                'params': {
                  // Doesn't make much sense but we want to test it's not removing it from anything else
                  time_zone: 'Europe/Berlin',
                },
                'schema': 'metric',
                'type': 'count'
              },
              {
                'enabled': true,
                'id': '2',
                'params': {
                  'customInterval': '2h',
                  'drop_partials': false,
                  'extended_bounds': {},
                  'field': 'timestamp',
                  'time_zone': 'Europe/Berlin',
                  'interval': 'auto',
                  'min_doc_count': 1,
                  'useNormalizedEsInterval': true
                },
                'schema': 'segment',
                'type': 'date_histogram'
              },
              {
                'enabled': true,
                'id': '4',
                'params': {
                  'customInterval': '2h',
                  'drop_partials': false,
                  'extended_bounds': {},
                  'field': 'timestamp',
                  'interval': 'auto',
                  'min_doc_count': 1,
                  'useNormalizedEsInterval': true
                },
                'schema': 'segment',
                'type': 'date_histogram'
              },
              {
                'enabled': true,
                'id': '3',
                'params': {
                  'customBucket': {
                    'enabled': true,
                    'id': '1-bucket',
                    'params': {
                      'customInterval': '2h',
                      'drop_partials': false,
                      'extended_bounds': {},
                      'field': 'timestamp',
                      'interval': 'auto',
                      'min_doc_count': 1,
                      'time_zone': 'Europe/Berlin',
                      'useNormalizedEsInterval': true
                    },
                    'type': 'date_histogram'
                  },
                  'customMetric': {
                    'enabled': true,
                    'id': '1-metric',
                    'params': {},
                    'type': 'count'
                  }
                },
                'schema': 'metric',
                'type': 'max_bucket'
              },
            ]
          }),
        }
      };
    });

    it('should remove time_zone from date_histogram aggregations', () => {
      const migratedDoc = migrate(doc);
      const aggs = JSON.parse(migratedDoc.attributes.visState).aggs;
      expect(aggs[1]).not.toHaveProperty('params.time_zone');
    });

    it('should not remove time_zone from non date_histogram aggregations', () => {
      const migratedDoc = migrate(doc);
      const aggs = JSON.parse(migratedDoc.attributes.visState).aggs;
      expect(aggs[0]).toHaveProperty('params.time_zone');
    });

    it('should remove time_zone from nested aggregations', () => {
      const migratedDoc = migrate(doc);
      const aggs = JSON.parse(migratedDoc.attributes.visState).aggs;
      expect(aggs[3]).not.toHaveProperty('params.customBucket.params.time_zone');
    });

    it('should not fail on date histograms without a time_zone', () => {
      const migratedDoc = migrate(doc);
      const aggs = JSON.parse(migratedDoc.attributes.visState).aggs;
      expect(aggs[2]).not.toHaveProperty('params.time_zone');
    });

    it('should be able to apply the migration twice, since we need it for 6.7.2 and 7.0.1', () => {
      const migratedDoc = migrate(migrate(doc));
      const aggs = JSON.parse(migratedDoc.attributes.visState).aggs;
      expect(aggs[1]).not.toHaveProperty('params.time_zone');
      expect(aggs[0]).toHaveProperty('params.time_zone');
      expect(aggs[3]).not.toHaveProperty('params.customBucket.params.time_zone');
      expect(aggs[2]).not.toHaveProperty('params.time_zone');
    });
  });

});
