import expect from 'expect.js';
import migrateIncludeExcludeFormat from 'ui/agg_types/buckets/migrate/include_exclude';

describe('include/exclude migration', function () {

  describe('serialize function', function () {

    it('it doesnt do anything with string type', function () {
      expect(migrateIncludeExcludeFormat.serialize('string')).to.equal('string');
    });

    it('converts object to string type', function () {
      expect(migrateIncludeExcludeFormat.serialize({ pattern: 'string' })).to.equal('string');
    });

  });

  describe('write function', function () {
    const self = { name: 'exclude' };
    const writeFunction = migrateIncludeExcludeFormat.write.bind(self);

    it('it doesnt do anything with string type', function () {
      const output = { params: {} };
      writeFunction({ params: { exclude: 'string' } }, output);
      expect(output.params.exclude).to.equal('string');
    });

    it('converts object to string type', function () {
      const output = { params: {} };
      writeFunction({ params: { exclude: { pattern: 'string' } } }, output);
      expect(output.params.exclude).to.equal('string');
    });
  });

});
