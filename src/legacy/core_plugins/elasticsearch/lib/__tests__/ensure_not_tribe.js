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

import expect from 'expect.js';
import sinon from 'sinon';

import { ensureNotTribe } from '../ensure_not_tribe';

describe('plugins/elasticsearch ensureNotTribe', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

  const stubcallWithInternalUser = (nodesInfoResp = { nodes: {} }) => {
    return sinon.stub().withArgs(
      'nodes.info',
      sinon.match.any
    ).returns(
      Promise.resolve(nodesInfoResp)
    );
  };


  it('fetches the local node stats of the node that the elasticsearch client is connected to', async () => {
    const callWithInternalUser = stubcallWithInternalUser();
    await ensureNotTribe(callWithInternalUser);
    sinon.assert.calledOnce(callWithInternalUser);
  });

  it('throws a SetupError when the node info contains tribe settings', async () => {
    const nodeInfo = {
      nodes: {
        __nodeId__: {
          settings: {
            tribe: {
              t1: {},
              t2: {},
            }
          }
        }
      }
    };

    try {
      await ensureNotTribe(stubcallWithInternalUser(nodeInfo));
      throw new Error('ensureNotTribe() should have thrown');
    } catch (err) {
      expect(err).to.be.a(Error);
    }
  });
});
