import expect from 'expect.js';
import _ from 'lodash';
import { kibanaToEs, esToKibana } from '../converter';

describe('ingest', () => {

  describe('processors', () => {

    describe('converters', () => {

      describe('split', () => {

        describe('kibanaToEs', () => {

          let source;
          let expected;
          beforeEach(function () {
            source = {
              processor_id: 'foo_processor_id',
              source_field: 'foo_source_field',
              separator: 'foo_separator',
              ignore_failure: 'foo_ignore_failure'
            };

            expected = {
              split: {
                tag: 'foo_processor_id',
                field: 'foo_source_field',
                separator: 'foo_separator',
                ignore_failure: 'foo_ignore_failure'
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
              split: {
                tag: 'foo_tag',
                field: 'foo_field',
                separator: 'foo_separator',
                ignore_failure: 'foo_ignore_failure'
              }
            };

            expected = {
              typeId: 'split',
              processor_id: 'foo_tag',
              source_field: 'foo_field',
              separator: 'foo_separator',
              ignore_failure: 'foo_ignore_failure'
            };
          });

          it('should convert from an elasticsearch object to a kibana api object', () => {
            const actual = esToKibana(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should ignore additional source fields', () => {
            source.split.foo = 'bar';
            source.split.bar = 'baz';

            const actual = esToKibana(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should throw an error if argument does not have an [split] property', () => {
            const errorMessage = /elasticsearch processor document missing \[split\] property/i;

            source.foo = _.clone(source.split);
            delete source.split;
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
