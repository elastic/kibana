import expect from 'expect.js';

import UiExports from '../ui_exports';

describe('UiExports', function () {
  describe('#find()', function () {
    it('finds exports based on the passed export names', function () {
      var uiExports = new UiExports({});
      uiExports.aliases.foo = ['a', 'b', 'c'];
      uiExports.aliases.bar = ['d', 'e', 'f'];

      expect(uiExports.find(['foo'])).to.eql(['a', 'b', 'c']);
      expect(uiExports.find(['bar'])).to.eql(['d', 'e', 'f']);
      expect(uiExports.find(['foo', 'bar'])).to.eql(['a', 'b', 'c', 'd', 'e', 'f']);
    });

    it('allows query types that match nothing', function () {
      var uiExports = new UiExports({});
      uiExports.aliases.foo = ['a', 'b', 'c'];

      expect(uiExports.find(['foo'])).to.eql(['a', 'b', 'c']);
      expect(uiExports.find(['bar'])).to.eql([]);
      expect(uiExports.find(['foo', 'bar'])).to.eql(['a', 'b', 'c']);
    });
  });
});
