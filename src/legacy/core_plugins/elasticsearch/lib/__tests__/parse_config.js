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
import { parseConfig } from '../parse_config';

describe('plugins/elasticsearch', function () {
  describe('lib/parse_config', function () {
    describe('ssl', function () {
      let serverConfig;

      beforeEach(function () {
        serverConfig = {
          url: 'https://localhost:9200',
          ssl: {
            verificationMode: 'full'
          }
        };
      });

      it('throws an Exception when verificationMode is undefined', function () {
        delete serverConfig.ssl.verificationMode;

        expect(parseConfig).withArgs(serverConfig).to.throwException();
      });

      it('sets rejectUnauthorized to false when verificationMode is none', function () {
        serverConfig.ssl.verificationMode = 'none';
        const config = parseConfig(serverConfig);
        expect(config.ssl.rejectUnauthorized).to.be(false);
      });

      it('sets rejectUnauthorized to true when verificationMode is certificate', function () {
        serverConfig.ssl.verificationMode = 'certificate';
        const config = parseConfig(serverConfig);
        expect(config.ssl.rejectUnauthorized).to.be(true);
      });

      it('sets checkServerIdentity to not check hostname when verificationMode is certificate', function () {
        serverConfig.ssl.verificationMode = 'certificate';
        const config = parseConfig(serverConfig);

        const cert = {
          subject: {
            CN: 'wrong.com'
          }
        };

        expect(config.ssl.checkServerIdentity).withArgs('right.com', cert).to.not.throwException();
        const result = config.ssl.checkServerIdentity('right.com', cert);
        expect(result).to.be(undefined);
      });

      it('sets rejectUnauthorized to true when verificationMode is full', function () {
        serverConfig.ssl.verificationMode = 'full';
        const config = parseConfig(serverConfig);

        expect(config.ssl.rejectUnauthorized).to.be(true);
      });

      it(`doesn't set checkServerIdentity when verificationMode is full`, function () {
        serverConfig.ssl.verificationMode = 'full';
        const config = parseConfig(serverConfig);

        expect(config.ssl.checkServerIdentity).to.be(undefined);
      });

      it(`sets ca when certificateAuthorities are specified`, function () {
        serverConfig.ssl.certificateAuthorities = [__dirname + '/fixtures/ca.crt'];

        const config = parseConfig(serverConfig);
        expect(config.ssl.ca).to.contain('test ca certificate\n');
      });

      it(`by default sets cert and key when certificate and key paths are specified`, function () {
        serverConfig.ssl.certificate = __dirname + '/fixtures/cert.crt';
        serverConfig.ssl.key = __dirname + '/fixtures/cert.key';

        const config = parseConfig(serverConfig);
        expect(config.ssl.cert).to.be('test certificate\n');
        expect(config.ssl.key).to.be('test key\n');
      });

      it(`by default sets passphrase when certificate, key and keyPassphrase are specified`, function () {
        serverConfig.ssl.certificate = __dirname + '/fixtures/cert.crt';
        serverConfig.ssl.key = __dirname + '/fixtures/cert.key';
        serverConfig.ssl.keyPassphrase = 'secret';

        const config = parseConfig(serverConfig);
        expect(config.ssl.passphrase).to.be('secret');
      });

      it(`doesn't set cert and key when ignoreCertAndKey is true`, function () {
        serverConfig.ssl.certificate = __dirname + '/fixtures/cert.crt';
        serverConfig.ssl.key = __dirname + '/fixtures/cert.key';

        const config = parseConfig(serverConfig, { ignoreCertAndKey: true });
        expect(config.ssl.cert).to.be(undefined);
        expect(config.ssl.key).to.be(undefined);
      });

      it(`by default sets passphrase when ignoreCertAndKey is true`, function () {
        serverConfig.ssl.certificate = __dirname + '/fixtures/cert.crt';
        serverConfig.ssl.key = __dirname + '/fixtures/cert.key';
        serverConfig.ssl.keyPassphrase = 'secret';

        const config = parseConfig(serverConfig, { ignoreCertAndKey: true });
        expect(config.ssl.passphrase).to.be(undefined);
      });

      describe('port', () => {
        it('uses the specified port', () => {
          const config1 = parseConfig(serverConfig);
          expect(config1.host.port).to.be('9200');

          serverConfig.url = 'https://localhost:555';
          const config2 = parseConfig(serverConfig);
          expect(config2.host.port).to.be('555');
        });

        it('uses port 80 if http and no specified port', () => {
          serverConfig.url = 'http://localhost';
          const config2 = parseConfig(serverConfig);
          expect(config2.host.port).to.be('80');
        });

        it ('uses port 443 if https and no specified port', () => {
          serverConfig.url = 'https://localhost';
          const config2 = parseConfig(serverConfig);
          expect(config2.host.port).to.be('443');
        });
      });
    });
  });
});
