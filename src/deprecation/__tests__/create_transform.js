import { createTransform } from '../create_transform';
import expect from 'expect.js';
import sinon from 'sinon';

describe('deprecation', function () {
  describe('createTransform', function () {
    it(`doesn't modify settings parameter`, function () {
      const settings = {
        original: true
      };
      const deprecations = [(settings) => {
        settings.origial = false;
      }];
      createTransform(deprecations)(settings);
      expect(settings.original).to.be(true);
    });

    it('calls single deprecation in array', function () {
      const deprecations = [sinon.spy()];
      createTransform(deprecations)({});
      expect(deprecations[0].calledOnce).to.be(true);
    });

    it('calls multiple deprecations in array', function () {
      const deprecations = [sinon.spy(), sinon.spy()];
      createTransform(deprecations)({});
      expect(deprecations[0].calledOnce).to.be(true);
      expect(deprecations[1].calledOnce).to.be(true);
    });

    it('passes log function to deprecation', function () {
      const deprecation = sinon.spy();
      const log = function () {};
      createTransform([deprecation])({}, log);
      expect(deprecation.args[0][1]).to.be(log);
    });
  });
});
