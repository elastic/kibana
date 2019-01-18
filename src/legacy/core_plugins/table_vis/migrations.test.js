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

describe('table vis migrations', () => {

  describe('7.0.0', () => {
    const migrate = doc => migrations.visualization['7.0.0'](doc);
    const generateDoc = ({ type, aggs }) => ({
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: JSON.stringify({ type, aggs }),
        uiStateJSON: '{}',
        version: 1,
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{}'
        }
      }
    });

    it('should return a new object if vis is table and has multiple split aggs', () => {
      const aggs = [
        {
          id: '1',
          schema: 'metric',
          params: {}
        },
        {
          id: '2',
          schema: 'split',
          params: { foo: 'bar', row: true }
        },
        {
          id: '3',
          schema: 'split',
          params: { hey: 'ya', row: false }
        },
      ];
      const tableDoc = generateDoc({ type: 'table', aggs });
      const expected = tableDoc;
      const actual = migrate(tableDoc);
      expect(actual).not.toBe(expected);
    });

    it('should not touch any vis that is not table', () => {
      const aggs = [];
      const pieDoc = generateDoc({ type: 'pie', aggs });
      const expected = pieDoc;
      const actual = migrate(pieDoc);
      expect(actual).toBe(expected);
    });

    it('should not change values in any vis that is not table', () => {
      const aggs = [
        {
          id: '1',
          schema: 'metric',
          params: {}
        },
        {
          id: '2',
          schema: 'split',
          params: { foo: 'bar', row: true }
        },
        {
          id: '3',
          schema: 'segment',
          params: { hey: 'ya' }
        }
      ];
      const pieDoc = generateDoc({ type: 'pie', aggs });
      const expected = pieDoc;
      const actual = migrate(pieDoc);
      expect(actual).toEqual(expected);
    });

    it('should not touch table vis if there are not multiple split aggs', () => {
      const aggs = [
        {
          id: '1',
          schema: 'metric',
          params: {}
        },
        {
          id: '2',
          schema: 'split',
          params: { foo: 'bar', row: true }
        }
      ];
      const tableDoc = generateDoc({ type: 'table', aggs });
      const expected = tableDoc;
      const actual = migrate(tableDoc);
      expect(actual).toBe(expected);
    });

    it('should change all split aggs to `bucket` except the first', () => {
      const aggs = [
        {
          id: '1',
          schema: 'metric',
          params: {}
        },
        {
          id: '2',
          schema: 'split',
          params: { foo: 'bar', row: true }
        },
        {
          id: '3',
          schema: 'split',
          params: { hey: 'ya', row: false }
        },
        {
          id: '4',
          schema: 'bucket',
          params: { heyyy: 'yaaa' }
        }
      ];
      const expected = ['metric', 'split', 'bucket', 'bucket'];
      const migrated = migrate(generateDoc({ type: 'table', aggs }));
      const actual = JSON.parse(migrated.attributes.visState);
      expect(actual.aggs.map(agg => agg.schema)).toEqual(expected);
    });

    it('should remove `rows` param from any aggs that are not `split`', () => {
      const aggs = [
        {
          id: '1',
          schema: 'metric',
          params: {}
        },
        {
          id: '2',
          schema: 'split',
          params: { foo: 'bar', row: true }
        },
        {
          id: '3',
          schema: 'split',
          params: { hey: 'ya', row: false }
        }
      ];
      const expected = [{}, { foo: 'bar', row: true }, { hey: 'ya' }];
      const migrated = migrate(generateDoc({ type: 'table', aggs }));
      const actual = JSON.parse(migrated.attributes.visState);
      expect(actual.aggs.map(agg => agg.params)).toEqual(expected);
    });

    it('should throw with a reference to the doc name if something goes wrong', () => {
      const doc = {
        attributes: {
          title: 'My Vis',
          description: 'This is my super cool vis.',
          visState: '!/// Intentionally malformed JSON ///!',
          uiStateJSON: '{}',
          version: 1,
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{}'
          }
        }
      };
      expect(() => migrate(doc)).toThrowError(/My Vis/);
    });
  });

});
