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

import _ from 'lodash';
import sinon from 'sinon';
import { ElasticIndex } from './elastic_index';

describe('ElasticIndex', () => {
  describe('write', () => {
    test('writes documents in bulk to the index', async () => {
      const index = '.myalias';
      const callCluster = sinon.stub();
      const docs = [
        {
          _id: 'niceguy:fredrogers',
          _source: {
            type: 'niceguy',
            niceguy: {
              aka: 'Mr Rogers',
            },
            quotes: ['The greatest gift you ever give is your honest self.'],
          },
        },
        {
          _id: 'badguy:rickygervais',
          _source: {
            type: 'badguy',
            badguy: {
              aka: 'Dominic Badguy',
            },
            migrationVersion: { badguy: '2.3.4' },
          },
        },
      ];

      callCluster.returns(
        Promise.resolve({
          items: [],
        })
      );

      const writer = new ElasticIndex({
        callCluster,
        index,
      });

      await writer.write(docs);

      sinon.assert.calledOnce(callCluster);
      expect(callCluster.args[0]).toMatchSnapshot();
    });

    test('fails if any document fails', async () => {
      const index = '.myalias';
      const callCluster = sinon.stub();
      const docs = [
        {
          _id: 'niceguy:fredrogers',
          _source: {
            type: 'niceguy',
            niceguy: {
              aka: 'Mr Rogers',
            },
          },
        },
      ];

      callCluster.returns(
        Promise.resolve({
          items: [{ index: { error: { type: 'shazm', reason: 'dern' } } }],
        })
      );

      const writer = new ElasticIndex({
        callCluster,
        index,
      });

      await expect(writer.write(docs)).rejects.toThrow(/dern/);
      sinon.assert.calledOnce(callCluster);
    });
  });

  describe('reader', () => {
    test('returns docs in batches', async () => {
      const index = '.myalias';
      const callCluster = sinon.stub();

      const batch1 = [
        {
          _id: 'such:1',
          _source: { type: 'such', such: { num: 1 } },
        },
      ];

      const batch2 = [
        {
          _id: 'aaa:2',
          _source: { type: 'aaa', aaa: { num: 2 } },
        },
        {
          _id: 'bbb:3',
          _source: {
            bbb: { num: 3 },
            migrationVersion: { bbb: '3.2.5' },
            type: 'bbb',
          },
        },
      ];

      callCluster
        .onCall(0)
        .returns(Promise.resolve({ _scroll_id: 'x', hits: { hits: _.cloneDeep(batch1) } }))
        .onCall(1)
        .returns(Promise.resolve({ _scroll_id: 'y', hits: { hits: _.cloneDeep(batch2) } }))
        .onCall(2)
        .returns(Promise.resolve({ _scroll_id: 'z', hits: { hits: [] } }))
        .onCall(3)
        .returns(Promise.resolve());

      const read = new ElasticIndex({
        callCluster,
        index,
      }).reader({ batchSize: 100, scrollDuration: '5m' });

      expect(await read()).toEqual(batch1);
      expect(await read()).toEqual(batch2);
      expect(await read()).toEqual([]);

      // Check order of calls, as well as args
      expect(callCluster.args).toEqual([
        ['search', { body: { size: 100 }, index, scroll: '5m' }],
        ['scroll', { scroll: '5m', scrollId: 'x' }],
        ['scroll', { scroll: '5m', scrollId: 'y' }],
        ['clearScroll', { scrollId: 'z' }],
      ]);
    });

    test('returns all root-level properties', async () => {
      const index = '.myalias';
      const callCluster = sinon.stub();
      const batch = [
        {
          _id: 'such:1',
          _source: {
            acls: '3230a',
            foos: { is: 'fun' },
            such: { num: 1 },
            type: 'such',
          },
        },
      ];

      callCluster
        .onCall(0)
        .returns(Promise.resolve({ _scroll_id: 'x', hits: { hits: _.cloneDeep(batch) } }))
        .onCall(1)
        .returns(Promise.resolve({ _scroll_id: 'z', hits: { hits: [] } }));

      const read = new ElasticIndex({
        callCluster,
        index,
      }).reader({
        batchSize: 100,
        scrollDuration: '5m',
      });

      expect(await read()).toEqual(batch);
    });
  });
});
