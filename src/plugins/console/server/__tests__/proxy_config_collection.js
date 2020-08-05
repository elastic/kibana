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

/* eslint-env mocha */

import expect from '@kbn/expect';
import sinon from 'sinon';
import fs from 'fs';
import { Agent as HttpsAgent } from 'https';

import { ProxyConfigCollection } from '../lib/proxy_config_collection';

describe('ProxyConfigCollection', function () {
  beforeEach(function () {
    sinon.stub(fs, 'readFileSync').callsFake(() => Buffer.alloc(0));
  });

  afterEach(function () {
    fs.readFileSync.restore();
  });

  const proxyConfigs = [
    {
      match: {
        protocol: 'https',
        host: 'localhost',
        port: 5601,
        path: '/.kibana',
      },

      timeout: 1,
    },

    {
      match: {
        protocol: 'https',
        host: 'localhost',
        port: 5601,
      },

      timeout: 2,
    },

    {
      match: {
        host: 'localhost',
        port: 5601,
      },

      timeout: 3,
    },

    {
      match: {
        host: 'localhost',
      },

      timeout: 4,
    },

    {
      match: {},

      timeout: 5,
    },
  ];

  function getTimeout(uri) {
    const collection = new ProxyConfigCollection(proxyConfigs);
    return collection.configForUri(uri).timeout;
  }

  describe('http://localhost:5601', function () {
    it('defaults to the first matching timeout', function () {
      expect(getTimeout('http://localhost:5601')).to.be(3);
    });
  });

  describe('https://localhost:5601/.kibana', function () {
    it('defaults to the first matching timeout', function () {
      expect(getTimeout('https://localhost:5601/.kibana')).to.be(1);
    });
  });

  describe('http://localhost:5602', function () {
    it('defaults to the first matching timeout', function () {
      expect(getTimeout('http://localhost:5602')).to.be(4);
    });
  });

  describe('https://localhost:5602', function () {
    it('defaults to the first matching timeout', function () {
      expect(getTimeout('https://localhost:5602')).to.be(4);
    });
  });

  describe('http://localhost:5603', function () {
    it('defaults to the first matching timeout', function () {
      expect(getTimeout('http://localhost:5603')).to.be(4);
    });
  });

  describe('https://localhost:5603', function () {
    it('defaults to the first matching timeout', function () {
      expect(getTimeout('https://localhost:5603')).to.be(4);
    });
  });

  describe('https://localhost:5601/index', function () {
    it('defaults to the first matching timeout', function () {
      expect(getTimeout('https://localhost:5601/index')).to.be(2);
    });
  });

  describe('http://localhost:5601/index', function () {
    it('defaults to the first matching timeout', function () {
      expect(getTimeout('http://localhost:5601/index')).to.be(3);
    });
  });

  describe('https://localhost:5601/index/type', function () {
    it('defaults to the first matching timeout', function () {
      expect(getTimeout('https://localhost:5601/index/type')).to.be(2);
    });
  });

  describe('http://notlocalhost', function () {
    it('defaults to the first matching timeout', function () {
      expect(getTimeout('http://notlocalhost')).to.be(5);
    });
  });

  describe('collection with ssl config and root level verify:false', function () {
    function makeCollection() {
      return new ProxyConfigCollection([
        {
          match: { host: '*.internal.org' },
          ssl: { ca: ['path/to/ca'] },
        },
        {
          match: { host: '*' },
          ssl: { verify: false },
        },
      ]);
    }

    it('verifies for config that produces ssl agent', function () {
      const conf = makeCollection().configForUri('https://es.internal.org/_search');
      expect(conf.agent.options).to.have.property('rejectUnauthorized', true);
      expect(conf.agent).to.be.an(HttpsAgent);
    });

    it('disabled verification for * config', function () {
      const conf = makeCollection().configForUri('https://extenal.org/_search');
      expect(conf).to.have.property('rejectUnauthorized', false);
      expect(conf.agent).to.be(undefined);
    });
  });
});
