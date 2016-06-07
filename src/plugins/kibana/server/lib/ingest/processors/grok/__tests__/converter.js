import expect from 'expect.js';
import _ from 'lodash';
import { kibanaToEs, esToKibana } from '../converter';

describe('ingest', () => {

  describe('processors', () => {

    describe('converters', () => {

      describe('grok', () => {

        describe('kibanaToEs', () => {

          let source;
          let expected;
          beforeEach(function () {
            source = {
              processor_id: 'foo_processor_id',
              source_field: 'foo_source_field',
              pattern: 'foo_pattern'
            };

            expected = {
              grok: {
                tag: 'foo_processor_id',
                field: 'foo_source_field',
                pattern: 'foo_pattern'
              }
            };
          });

          it('should convert from a kibana api object to an elasticsearch object', () => {
            const actual = kibanaToEs(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should ignore additional source fields', () => {
            source.foo = 'bar';
            source.bar = 'baz';

            const actual = kibanaToEs(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

        });

        describe('esToKibana', () => {

          let source;
          let expected;
          beforeEach(function () {
            source = {
              tag: 'foo_tag',
              field: 'foo_field',
              pattern: 'foo_pattern'
            };

            expected = {
              typeId: 'grok',
              processor_id: 'foo_tag',
              source_field: 'foo_field',
              pattern: 'foo_pattern'
            };
          });

          it('should convert from an elasticsearch object to a kibana api object', () => {
            const actual = esToKibana(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should ignore additional source fields', () => {
            source.foo = 'bar';
            source.bar = 'baz';

            const actual = esToKibana(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

        });

      });

    });

  });

});
