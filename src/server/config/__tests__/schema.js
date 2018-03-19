import schemaProvider from '../schema';
import expect from 'expect.js';
import Joi from 'joi';
import { set } from 'lodash';

describe('Config schema', function () {
  let schema;
  beforeEach(() => schema = schemaProvider());

  function validate(data, options) {
    return Joi.validate(data, schema, options);
  }

  describe('server', function () {
    it('everything is optional', function () {
      const { error } = validate({});
      expect(error).to.be(null);
    });

    describe('basePath', function () {
      it('accepts empty strings', function () {
        const { error, value } = validate({ server: { basePath: '' } });
        expect(error == null).to.be.ok();
        expect(value.server.basePath).to.be('');
      });

      it('accepts strings with leading slashes', function () {
        const { error, value } = validate({ server: { basePath: '/path' } });
        expect(error == null).to.be.ok();
        expect(value.server.basePath).to.be('/path');
      });

      it('rejects strings with trailing slashes', function () {
        const { error } = validate({ server: { basePath: '/path/' } });
        expect(error).to.have.property('details');
        expect(error.details[0]).to.have.property('path', 'server.basePath');
      });

      it('rejects strings without leading slashes', function () {
        const { error } = validate({ server: { basePath: 'path' } });
        expect(error).to.have.property('details');
        expect(error.details[0]).to.have.property('path', 'server.basePath');
      });

      it('rejects things that are not strings', function () {
        for (const value of [1, true, {}, [], /foo/]) {
          const { error } = validate({ server: { basePath: value } });
          expect(error).to.have.property('details');
          expect(error.details[0]).to.have.property('path', 'server.basePath');
        }
      });
    });

    describe('rewriteBasePath', function () {
      it('defaults to false', () => {
        const { error, value } = validate({});
        expect(error).to.be(null);
        expect(value.server.rewriteBasePath).to.be(false);
      });

      it('accepts false', function () {
        const { error, value } = validate({ server: { rewriteBasePath: false } });
        expect(error).to.be(null);
        expect(value.server.rewriteBasePath).to.be(false);
      });

      it('accepts true if basePath set', function () {
        const { error, value } = validate({ server: { basePath: '/foo', rewriteBasePath: true } });
        expect(error).to.be(null);
        expect(value.server.rewriteBasePath).to.be(true);
      });

      it('rejects true if basePath not set', function () {
        const { error } = validate({ server: { rewriteBasePath: true } });
        expect(error).to.have.property('details');
        expect(error.details[0]).to.have.property('path', 'server.rewriteBasePath');
      });

      it('rejects strings', function () {
        const { error } = validate({ server: { rewriteBasePath: 'foo' } });
        expect(error).to.have.property('details');
        expect(error.details[0]).to.have.property('path', 'server.rewriteBasePath');
      });
    });

    describe('ssl', function () {
      describe('enabled', function () {

        it('can\'t be a string', function () {
          const config = {};
          set(config, 'server.ssl.enabled', 'bogus');
          const { error } = validate(config);
          expect(error).to.be.an(Object);
          expect(error).to.have.property('details');
          expect(error.details[0]).to.have.property('path', 'server.ssl.enabled');
        });

        it('can be true', function () {
          const config = {};
          set(config, 'server.ssl.enabled', true);
          set(config, 'server.ssl.certificate', '/path.cert');
          set(config, 'server.ssl.key', '/path.key');
          const { error } = validate(config);
          expect(error).to.be(null);
        });

        it('can be false', function () {
          const config = {};
          set(config, 'server.ssl.enabled', false);
          const { error } = validate(config);
          expect(error).to.be(null);
        });
      });

      describe('certificate', function () {

        it('isn\'t required when ssl isn\'t enabled', function () {
          const config = {};
          set(config, 'server.ssl.enabled', false);
          const { error } = validate(config);
          expect(error).to.be(null);
        });

        it('is required when ssl is enabled', function () {
          const config = {};
          set(config, 'server.ssl.enabled', true);
          set(config, 'server.ssl.key', '/path.key');
          const { error } = validate(config);
          expect(error).to.be.an(Object);
          expect(error).to.have.property('details');
          expect(error.details[0]).to.have.property('path', 'server.ssl.certificate');
        });

        it('is forbidden when server.ssl.pfx is set', function () {
          const config = {};
          set(config, 'server.ssl.enabled', true);
          set(config, 'server.ssl.pfx', '/path.pfx');
          set(config, 'server.ssl.certificate', '/path.crt');
          const { error } = validate(config);
          expect(error).to.be.an(Object);
          expect(error).to.have.property('details');
          expect(error.details[0]).to.have.property('path', 'server.ssl.certificate');
        });
      });

      describe('key', function () {
        it('isn\'t required when ssl isn\'t enabled', function () {
          const config = {};
          set(config, 'server.ssl.enabled', false);
          const { error } = validate(config);
          expect(error).to.be(null);
        });

        it('is required when ssl is enabled', function () {
          const config = {};
          set(config, 'server.ssl.enabled', true);
          set(config, 'server.ssl.certificate', '/path.cert');
          const { error } = validate(config);
          expect(error).to.be.an(Object);
          expect(error).to.have.property('details');
          expect(error.details[0]).to.have.property('path', 'server.ssl.key');
        });

        it('is forbidden when server.ssl.pfx is set', function () {
          const config = {};
          set(config, 'server.ssl.enabled', true);
          set(config, 'server.ssl.pfx', '/path.pfx');
          set(config, 'server.ssl.key', '/path.key');
          const { error } = validate(config);
          expect(error).to.be.an(Object);
          expect(error).to.have.property('details');
          expect(error.details[0]).to.have.property('path', 'server.ssl.key');
        });
      });

      describe('pfx', function () {
        it('isn\'t required when ssl isn\'t enabled', function () {
          const config = {};
          set(config, 'server.ssl.enabled', false);
          const { error } = validate(config);
          expect(error).to.be(null);
        });

        it('is allowed when ssl is enabled, and a certificate is not specified', function () {
          const config = {};
          set(config, 'server.ssl.enabled', true);
          set(config, 'server.ssl.pfx', '/path.pfx');
          const { error } = validate(config);
          expect(error).to.be(null);
        });
      });

      describe('keyPassphrase', function () {
        it ('is a possible config value', function () {
          const config = {};
          set(config, 'server.ssl.keyPassphrase', 'password');
          const { error } = validate(config);
          expect(error).to.be(null);
        });
      });

      describe('certificateAuthorities', function () {
        it('allows array of string', function () {
          const config = {};
          set(config, 'server.ssl.certificateAuthorities', ['/path1.crt', '/path2.crt']);
          const { error } = validate(config);
          expect(error).to.be(null);
        });

        it('allows a single string', function () {
          const config = {};
          set(config, 'server.ssl.certificateAuthorities', '/path1.crt');
          const { error } = validate(config);
          expect(error).to.be(null);
        });
      });

      describe('supportedProtocols', function () {

        it ('rejects SSLv2', function () {
          const config = {};
          set(config, 'server.ssl.supportedProtocols', ['SSLv2']);
          const { error } = validate(config);
          expect(error).to.be.an(Object);
          expect(error).to.have.property('details');
          expect(error.details[0]).to.have.property('path', 'server.ssl.supportedProtocols.0');
        });

        it('rejects SSLv3', function () {
          const config = {};
          set(config, 'server.ssl.supportedProtocols', ['SSLv3']);
          const { error } = validate(config);
          expect(error).to.be.an(Object);
          expect(error).to.have.property('details');
          expect(error.details[0]).to.have.property('path', 'server.ssl.supportedProtocols.0');
        });

        it('accepts TLSv1, TLSv1.1, TLSv1.2', function () {
          const config = {};
          set(config, 'server.ssl.supportedProtocols', ['TLSv1', 'TLSv1.1', 'TLSv1.2']);
          const { error } = validate(config);
          expect(error).to.be(null);
        });
      });
    });

    describe('xsrf', () => {
      it('disableProtection is `false` by default.', () => {
        const { error, value: { server: { xsrf: { disableProtection } } } } = validate({});
        expect(error).to.be(null);
        expect(disableProtection).to.be(false);
      });

      it('whitelist is empty by default.', () => {
        const { value: { server: { xsrf: { whitelist } } } } = validate({});
        expect(whitelist).to.be.an(Array);
        expect(whitelist).to.have.length(0);
      });

      it('whitelist rejects paths that do not start with a slash.', () => {
        const config = {};
        set(config, 'server.xsrf.whitelist', ['path/to']);

        const { error } = validate(config);
        expect(error).to.be.an(Object);
        expect(error).to.have.property('details');
        expect(error.details[0]).to.have.property('path', 'server.xsrf.whitelist.0');
      });

      it('whitelist accepts paths that start with a slash.', () => {
        const config = {};
        set(config, 'server.xsrf.whitelist', ['/path/to']);

        const { error, value: { server: { xsrf: { whitelist } } } } = validate(config);
        expect(error).to.be(null);
        expect(whitelist).to.be.an(Array);
        expect(whitelist).to.have.length(1);
        expect(whitelist).to.contain('/path/to');
      });
    });
  });
});
