import Joi from 'joi';
import expect from 'expect.js';

import schema from '../schema';

describe('default Config schema', function () {
  describe('server.ssl', function () {
    it('fails if cert is set without key', function () {
      let { error } = Joi.validate({
        server: {
          ssl: {
            cert: '/path/to/cert'
          }
        }
      }, schema);

      expect(error).to.be.an(Error);
    });

    it('fails if key is set without cert', function () {
      let { error } = Joi.validate({
        server: {
          ssl: {
            key: '/path/to/key'
          }
        }
      }, schema);

      expect(error).to.be.an(Error);
    });

    describe('.enabled', function () {
      it('is true if both cert and key are set', function () {
        const { value } = Joi.validate({
          server: {
            ssl: {
              cert: '/path/to/cert',
              key: '/path/to/key'
            }
          }
        }, schema);

        expect(value.server.ssl.enabled).to.be(true);
      });

      it('is false if neither cert or key is set', function () {
        const { value } = Joi.validate({
          server: {
            ssl: {}
          }
        }, schema);

        expect(value.server.ssl.enabled).to.be(false);
      });
    });
  });
});
