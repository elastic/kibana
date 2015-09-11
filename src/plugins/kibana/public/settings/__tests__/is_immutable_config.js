
var isImmutableConfig = require('plugins/kibana/settings/sections/advanced/lib/is_immutable_config');
var expect = require('expect.js');

describe('Settings', function () {
  describe('Advanced', function () {
    describe('isImmutableConfig(configName)', function () {
      it('returns true given an immutable field name', function () {
        expect(isImmutableConfig('buildNum')).to.be.true;
      });

      it('returns false given any value that does not match the whitelist', function () {
        expect(isImmutableConfig('something else')).to.be.false;
      });
    });
  });
});
