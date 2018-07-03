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

import sinon from 'sinon';
import { BatchIndexWriter } from './batch_index_writer';

describe('BatchIndexWriter', () => {
  test('writes documents in bulk to the index', async () => {
    const index = '.myalias';
    const callCluster = sinon.stub();
    const docs = [
      {
        attributes: {
          aka: 'Mr Rogers',
        },
        type: 'niceguy',
        id: 'fredrogers',
        quotes: ['The greatest gift you ever give is your honest self.'],
      },
      {
        attributes: {
          aka: 'Dominic Badguy',
        },
        id: 'rickygervais',
        migrationVersion: {
          badguy: '2.3.4',
        },
        type: 'badguy',
      },
    ];

    callCluster.returns(
      Promise.resolve({
        items: [],
      })
    );

    const writer = new BatchIndexWriter({
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
        attributes: {
          aka: 'Mr Rogers',
        },
        type: 'niceguy',
        id: 'fredrogers',
      },
    ];

    callCluster.returns(
      Promise.resolve({
        items: [{ index: { error: { type: 'shazm', reason: 'dern' } } }],
      })
    );

    const writer = new BatchIndexWriter({
      callCluster,
      index,
    });

    await expect(writer.write(docs)).rejects.toThrow(/dern/);
    sinon.assert.calledOnce(callCluster);
  });
});
