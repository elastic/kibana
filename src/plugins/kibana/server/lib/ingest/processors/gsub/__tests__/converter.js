import expect from 'expect.js';
import _ from 'lodash';
import { kibanaToEs, esToKibana } from '../converter';

describe('ingest', () => {

  describe('processors', () => {

    describe('converters', () => {

      describe('gsub', () => {

        describe('kibanaToEs', () => {

          let source;
          let expected;
          beforeEach(function () {
            source = {
              processor_id: 'foo_processor_id',
              source_field: 'foo_source_field',
              pattern: 'foo_pattern',
              replacement: 'foo_replacement'
            };

            expected = {
              gsub: {
                tag: 'foo_processor_id',
                field: 'foo_source_field',
                pattern: 'foo_pattern',
                replacement: 'foo_replacement'
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
              gsub: {
                tag: 'foo_tag',
                field: 'foo_field',
                pattern: 'foo_pattern',
                replacement: 'foo_replacement'
              }
            };

            expected = {
              typeId: 'gsub',
              processor_id: 'foo_tag',
              source_field: 'foo_field',
              pattern: 'foo_pattern',
              replacement: 'foo_replacement'
            };
          });

          it('should convert from an elasticsearch object to a kibana api object', () => {
            const actual = esToKibana(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should ignore additional source fields', () => {
            source.gsub.foo = 'bar';
            source.gsub.bar = 'baz';

            const actual = esToKibana(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should throw an error if argument does not have an [gsub] property', () => {
            const errorMessage = /elasticsearch processor document missing \[gsub\] property/i;

            source.foo = _.clone(source.gsub);
            delete source.gsub;
            expect(esToKibana).withArgs(source).to.throwException(errorMessage);

            expect(esToKibana).withArgs(null).to.throwException(errorMessage);
            expect(esToKibana).withArgs(undefined).to.throwException(errorMessage);
            expect(esToKibana).withArgs('').to.throwException(errorMessage);
            expect(esToKibana).withArgs({}).to.throwException(errorMessage);
          });

        });

      });

    });

  });

});
