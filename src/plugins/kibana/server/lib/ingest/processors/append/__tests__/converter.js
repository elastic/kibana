import expect from 'expect.js';
import _ from 'lodash';
import { kibanaToEs, esToKibana } from '../converter';

describe('ingest', () => {

  describe('processors', () => {

    describe('converters', () => {

      describe('append', () => {

        describe('kibanaToEs', () => {

          let source;
          let expected;
          beforeEach(function () {
            source = {
              processor_id: 'foo_processor_id',
              target_field: 'foo_target_field',
              values: 'foo_values',
              ignore_failure: 'foo_ignore_failure'
            };

            expected = {
              append: {
                tag: 'foo_processor_id',
                field: 'foo_target_field',
                value: 'foo_values',
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
              tag: 'foo_tag',
              field: 'foo_field',
              value: 'foo_value',
              ignore_failure: 'foo_ignore_failure'
            };

            expected = {
              typeId: 'append',
              processor_id: 'foo_tag',
              target_field: 'foo_field',
              values: 'foo_value',
              ignore_failure: 'foo_ignore_failure'
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
