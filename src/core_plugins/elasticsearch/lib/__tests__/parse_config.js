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

      it(`sets cert and key when certificate and key paths are specified`, function () {
        serverConfig.ssl.certificate = __dirname + '/fixtures/cert.crt';
        serverConfig.ssl.key = __dirname + '/fixtures/cert.key';

        const config = parseConfig(serverConfig);
        expect(config.ssl.cert).to.be('test certificate\n');
        expect(config.ssl.key).to.be('test key\n');
      });

      it(`sets passphrase when certificate, key and keyPassphrase are specified`, function () {
        serverConfig.ssl.certificate = __dirname + '/fixtures/cert.crt';
        serverConfig.ssl.key = __dirname + '/fixtures/cert.key';
        serverConfig.ssl.keyPassphrase = 'secret';

        const config = parseConfig(serverConfig);
        expect(config.ssl.passphrase).to.be('secret');
      });
    });
  });
});
