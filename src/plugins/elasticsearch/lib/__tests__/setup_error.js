import requireCovered from '../../../../test_utils/requireCovered';
import expect from 'expect.js';

const SetupError = requireCovered('plugins/elasticsearch/lib/setup_error');

describe('plugins/elasticsearch', function () {
  describe('lib/setup_error', function () {

    const server = {
      config: function () {
        return {
          get: function () {
            return { kibana: { index: '.my-kibana' } };
          }
        };
      }
    };

    const err = new SetupError(server, 'Oops! <%= kibana.index %>');

    it('should allow config values in the message template', function () {
      expect(err).to.have.property('message', 'Oops! .my-kibana');
    });

    it('should set the name of the error', function () {
      expect(err).to.have.property('name', 'SetupError');
    });

    it('should set the stack trace', function () {
      expect(err).to.have.property('stack');
      expect(err.stack).to.match(/^SetupError/);
    });

    it('should return the passed error if it is a SetupError', function () {
      const error = new SetupError(server, 'Oh Boy!', err);
      expect(error).to.have.property('message', 'Oops! .my-kibana');
    });

    it('should store the original error', function () {
      const origError = new Error('Boom!');
      const error = new SetupError(server, 'Oh Boy!', origError);
      expect(error).to.have.property('origError', origError);
    });

    it('should copy the stack from the origError', function () {
      const origError = new Error('Boom!');
      const error = new SetupError(server, 'Oh Boy!', origError);
      expect(error).to.have.property('stack', origError.stack);
    });

  });
});

