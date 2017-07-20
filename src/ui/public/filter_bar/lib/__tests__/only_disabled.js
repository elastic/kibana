import { onlyDisabled } from 'ui/filter_bar/lib/only_disabled';
import expect from 'expect.js';

describe('Filter Bar Directive', function () {
  describe('onlyDisabled()', function () {

    it('should return true if all filters are disabled', function () {
      const filters = [
        { meta: { disabled: true } },
        { meta: { disabled: true } },
        { meta: { disabled: true } }
      ];
      const newFilters = [{ meta: { disabled: true } }];
      expect(onlyDisabled(newFilters, filters)).to.be(true);
    });

    it('should return false if all filters are not disabled', function () {
      const filters = [
        { meta: { disabled: false } },
        { meta: { disabled: false } },
        { meta: { disabled: false } }
      ];
      const newFilters = [{ meta: { disabled: false } }];
      expect(onlyDisabled(newFilters, filters)).to.be(false);
    });

    it('should return false if only old filters are disabled', function () {
      const filters = [
        { meta: { disabled: true } },
        { meta: { disabled: true } },
        { meta: { disabled: true } }
      ];
      const newFilters = [{ meta: { disabled: false } }];
      expect(onlyDisabled(newFilters, filters)).to.be(false);
    });

    it('should return false if new filters are not disabled', function () {
      const filters = [
        { meta: { disabled: false } },
        { meta: { disabled: false } },
        { meta: { disabled: false } }
      ];
      const newFilters = [{ meta: { disabled: true } }];
      expect(onlyDisabled(newFilters, filters)).to.be(false);
    });

    it('should return true when all removed filters were disabled', function () {
      const filters = [
        { meta: { disabled: true } },
        { meta: { disabled: true } },
        { meta: { disabled: true } }
      ];
      const newFilters = [];
      expect(onlyDisabled(newFilters, filters)).to.be(true);
    });

    it('should return false when all removed filters were not disabled', function () {
      const filters = [
        { meta: { disabled: false } },
        { meta: { disabled: false } },
        { meta: { disabled: false } }
      ];
      const newFilters = [];
      expect(onlyDisabled(newFilters, filters)).to.be(false);
    });

    it('should return true if all changed filters are disabled', function () {
      const filters = [
        { meta: { disabled: true, negate: false } },
        { meta: { disabled: true, negate: false } }
      ];
      const newFilters = [
        { meta: { disabled: true, negate: true } },
        { meta: { disabled: true, negate: true } }
      ];
      expect(onlyDisabled(newFilters, filters)).to.be(true);
    });

    it('should return false if all filters remove were not disabled', function () {
      const filters = [
        { meta: { disabled: false } },
        { meta: { disabled: false } },
        { meta: { disabled: true } }
      ];
      const newFilters = [{ meta: { disabled: false } }];
      expect(onlyDisabled(newFilters, filters)).to.be(false);
    });

    it('should return false when all removed filters are not disabled', function () {
      const filters = [
        { meta: { disabled: true } },
        { meta: { disabled: false } },
        { meta: { disabled: true } }
      ];
      const newFilters = [];
      expect(onlyDisabled(newFilters, filters)).to.be(false);
    });

    it('should not throw with null filters', function () {
      const filters = [
        null,
        { meta: { disabled: true } }
      ];
      const newFilters = [];
      expect(function () {
        onlyDisabled(newFilters, filters);
      }).to.not.throwError();
    });

  });
});
