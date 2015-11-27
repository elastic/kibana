import schemaProvider from '../schema';
import expect from 'expect.js';
import Joi from 'joi';

describe('Config schema', function () {
  let schema;
  beforeEach(() => schema = schemaProvider());

  function validate(data, options) {
    return Joi.validate(data, schema, options);
  }

  describe('server', function () {
    describe('basePath', function () {
      it('accepts empty strings', function () {
        const { error } = validate({ server: { basePath: '' }});
        expect(error == null).to.be.ok();
      });

      it('accepts strings with leading slashes', function () {
        const { error } = validate({ server: { basePath: '/path' }});
        expect(error == null).to.be.ok();
      });

      it('rejects strings with trailing slashes', function () {
        const { error } = validate({ server: { basePath: '/path/' }});
        expect(error).to.have.property('details');
        expect(error.details[0]).to.have.property('path', 'server.basePath');
      });

      it('rejects strings without leading slashes', function () {
        const { error } = validate({ server: { basePath: 'path' }});
        expect(error).to.have.property('details');
        expect(error.details[0]).to.have.property('path', 'server.basePath');
      });
    });
  });
});
