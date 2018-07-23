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

import { noop } from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import { Collector } from '../collector';
import { CollectorSet } from '../collector_set';

describe('CollectorSet', () => {
  describe('registers a collector set and runs lifecycle events', () => {
    let server;
    let init;
    let fetch;
    beforeEach(() => {
      server = { log: sinon.spy() };
      init = noop;
      fetch = noop;
    });

    it('should throw an error if non-Collector type of object is registered', () => {
      const collectors = new CollectorSet(server);
      const registerPojo = () => {
        collectors.register({
          type: 'type_collector_test',
          init,
          fetch,
        });
      };

      expect(registerPojo).to.throwException(({ message }) => {
        expect(message).to.be('CollectorSet can only have Collector instances registered');
      });
    });

    it('should log debug status of fetching from the collector', async () => {
      const mockCallCluster = () => Promise.resolve({ passTest: 1000 });
      const collectors = new CollectorSet(server);
      collectors.register(new Collector(server, {
        type: 'MY_TEST_COLLECTOR',
        fetch: caller => caller()
      }));

      const result = await collectors.bulkFetch(mockCallCluster);
      const calls = server.log.getCalls();
      expect(calls.length).to.be(1);
      expect(calls[0].args).to.eql([
        ['debug', 'stats-collection'],
        'Fetching data from MY_TEST_COLLECTOR collector',
      ]);
      expect(result).to.eql([{
        type: 'MY_TEST_COLLECTOR',
        result: { passTest: 1000 }
      }]);
    });
  });
});
