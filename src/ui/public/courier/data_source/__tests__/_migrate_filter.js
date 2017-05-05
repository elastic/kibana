import expect from 'expect.js';
import _ from 'lodash';
import { migrateFilter } from '../_migrate_filter';

describe('migrateFilter', function () {

  const oldMatchPhraseFilter = {
    match: {
      fieldFoo: {
        query: 'foobar',
        type: 'phrase'
      }
    }
  };

  const newMatchPhraseFilter = {
    match_phrase: {
      fieldFoo: {
        query: 'foobar'
      }
    }
  };

  // https://github.com/elastic/elasticsearch/pull/17508
  it('should migrate match filters of type phrase', function () {
    const migratedFilter = migrateFilter(oldMatchPhraseFilter);
    expect(_.isEqual(migratedFilter, newMatchPhraseFilter)).to.be(true);
  });

  it('should not modify the original filter', function () {
    const oldMatchPhraseFilterCopy = _.clone(oldMatchPhraseFilter, true);
    migrateFilter(oldMatchPhraseFilter);
    expect(_.isEqual(oldMatchPhraseFilter, oldMatchPhraseFilterCopy)).to.be(true);
  });

  it('should return the original filter if no migration is necessary', function () {
    const originalFilter = {
      match_all: {}
    };
    const migratedFilter = migrateFilter(originalFilter);
    expect(migratedFilter).to.be(originalFilter);
    expect(_.isEqual(migratedFilter, originalFilter)).to.be(true);
  });

});
