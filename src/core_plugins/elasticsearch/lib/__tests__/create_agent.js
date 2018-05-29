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
import createAgent from '../create_agent';
import https from 'https';
import http from 'http';

describe('plugins/elasticsearch', function () {
  describe('lib/create_agent', function () {

    it(`uses http.Agent when url's protocol is http`, function () {
      const config = {
        url: 'http://localhost:9200'
      };

      const agent = createAgent(config);
      expect(agent).to.be.a(http.Agent);
    });

    it(`throws an Error when url's protocol is https and ssl.verificationMode isn't set`, function () {
      const config = {
        url: 'https://localhost:9200'
      };

      expect(createAgent).withArgs(config).to.throwException();
    });

    it(`uses https.Agent when url's protocol is https and ssl.verificationMode is full`, function () {
      const config = {
        url: 'https://localhost:9200',
        ssl: {
          verificationMode: 'full'
        }
      };

      const agent = createAgent(config);
      expect(agent).to.be.a(https.Agent);
    });
  });
});
