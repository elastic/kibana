
import { buildInlineScriptForPhraseFilter, buildPhraseFilter } from 'ui/filter_manager/lib/phrase';
import expect from 'expect.js';
import _ from 'lodash';
import ngMock from 'ng_mock';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

let indexPattern;
let expected;

describe('Filter Manager', function () {
  describe('Phrase filter builder', function () {
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      expected = _.cloneDeep(require('fixtures/filter_skeleton'));
    }));

    it('should be a function', function () {
      expect(buildPhraseFilter).to.be.a(Function);
    });

    it('should return a match query filter when passed a standard field', function () {
      expected.query = {
        match: {
          bytes: {
            query: 5,
            type: 'phrase'
          }
        }
      };
      expect(buildPhraseFilter(indexPattern.fields.byName.bytes, 5, indexPattern)).to.eql(expected);
    });

    it('should return a script filter when passed a scripted field', function () {
      expected.meta.field = 'script number';
      _.set(expected, 'script.script', {
        inline: '(' + indexPattern.fields.byName['script number'].script + ') == value',
        lang: 'expression',
        params: {
          value: 5,
        }
      });
      expect(buildPhraseFilter(indexPattern.fields.byName['script number'], 5, indexPattern)).to.eql(expected);
    });
  });

  describe('buildInlineScriptForPhraseFilter', function () {

    it('should wrap painless scripts in a lambda', function () {
      const field = {
        lang: 'painless',
        script: 'return foo;',
      };

      const expected = `boolean compare(Supplier s, def v) {return s.get() == v;}` +
                       `compare(() -> { return foo; }, params.value);`;

      expect(buildInlineScriptForPhraseFilter(field)).to.be(expected);
    });

    it('should create a simple comparison for other langs', function () {
      const field = {
        lang: 'expression',
        script: 'doc[bytes].value',
      };

      const expected = `(doc[bytes].value) == value`;

      expect(buildInlineScriptForPhraseFilter(field)).to.be(expected);
    });
  });
});
