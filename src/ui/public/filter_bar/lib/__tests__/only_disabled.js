import onlyDisabled from 'ui/filter_bar/lib/only_disabled';
import expect from 'expect.js';
describe('Filter Bar Directive', function () {
  describe('onlyDisabled()', function () {

    it('should return true if all filters are disabled', function () {
      let filters = [
        { meta: { disabled: true } },
        { meta: { disabled: true } },
        { meta: { disabled: true } }
      ];
      let newFilters = [{ meta: { disabled: true } }];
      expect(onlyDisabled(newFilters, filters)).to.be(true);
    });

    it('should return false if all filters are not disabled', function () {
      let filters = [
        { meta: { disabled: false } },
        { meta: { disabled: false } },
        { meta: { disabled: false } }
      ];
      let newFilters = [{ meta: { disabled: false } }];
      expect(onlyDisabled(newFilters, filters)).to.be(false);
    });

    it('should return false if only old filters are disabled', function () {
      let filters = [
        { meta: { disabled: true } },
        { meta: { disabled: true } },
        { meta: { disabled: true } }
      ];
      let newFilters = [{ meta: { disabled: false } }];
      expect(onlyDisabled(newFilters, filters)).to.be(false);
    });

    it('should return false if new filters are not disabled', function () {
      let filters = [
        { meta: { disabled: false } },
        { meta: { disabled: false } },
        { meta: { disabled: false } }
      ];
      let newFilters = [{ meta: { disabled: true } }];
      expect(onlyDisabled(newFilters, filters)).to.be(false);
    });

    it('should return true when all removed filters were disabled', function () {
      let filters = [
        { meta: { disabled: true } },
        { meta: { disabled: true } },
        { meta: { disabled: true } }
      ];
      let newFilters = [];
      expect(onlyDisabled(newFilters, filters)).to.be(true);
    });

    it('should return false when all removed filters were not disabled', function () {
      let filters = [
        { meta: { disabled: false } },
        { meta: { disabled: false } },
        { meta: { disabled: false } }
      ];
      let newFilters = [];
      expect(onlyDisabled(newFilters, filters)).to.be(false);
    });

    it('should return true if all changed filters are disabled', function () {
      let filters = [
        { meta: { disabled: true, negate: false } },
        { meta: { disabled: true, negate: false } }
      ];
      let newFilters = [
        { meta: { disabled: true, negate: true } },
        { meta: { disabled: true, negate: true } }
      ];
      expect(onlyDisabled(newFilters, filters)).to.be(true);
    });

    it('should return false if all filters remove were not disabled', function () {
      let filters = [
        { meta: { disabled: false } },
        { meta: { disabled: false } },
        { meta: { disabled: true } }
      ];
      let newFilters = [{ meta: { disabled: false } }];
      expect(onlyDisabled(newFilters, filters)).to.be(false);
    });

    it('should return false when all removed filters are not disabled', function () {
      let filters = [
        { meta: { disabled: true } },
        { meta: { disabled: false } },
        { meta: { disabled: true } }
      ];
      let newFilters = [];
      expect(onlyDisabled(newFilters, filters)).to.be(false);
    });

    it('should not throw with null filters', function () {
      let filters = [
        null,
        { meta: { disabled: true } }
      ];
      let newFilters = [];
      expect(function () {
        onlyDisabled(newFilters, filters);
      }).to.not.throwError();
    });

  });
});
