import expect from 'expect.js';
import _ from 'lodash';
import { kibanaToEs, esToKibana } from '../converter';

describe('ingest', () => {

  describe('processors', () => {

    describe('converters', () => {

      describe('convert', () => {

        describe('kibanaToEs', () => {

          let source;
          let expected;
          beforeEach(function () {
            source = {
              typeId: 'convert',
              processor_id: 'foo_tag',
              source_field: 'foo_field',
              target_field: 'foo_target_field',
              type: 'auto'
            };

            expected = {
              convert: {
                tag: 'foo_tag',
                field: 'foo_field',
                target_field: 'foo_target_field',
                type: 'auto'
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

          it('should map [auto] type correctly', () => {
            source.type = 'auto';
            expected.convert.type = 'auto';

            const actual = kibanaToEs(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should map [number] type correctly', () => {
            source.type = 'number';
            expected.convert.type = 'float';

            const actual = kibanaToEs(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should map [string] type correctly', () => {
            source.type = 'string';
            expected.convert.type = 'string';

            const actual = kibanaToEs(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should map [boolean] type correctly', () => {
            source.type = 'boolean';
            expected.convert.type = 'boolean';

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
              target_field: 'foo_target_field',
              type: 'auto'
            };

            expected = {
              typeId: 'convert',
              processor_id: 'foo_tag',
              source_field: 'foo_field',
              target_field: 'foo_target_field',
              type: 'auto'
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

          it('should map [auto] type correctly', () => {
            source.type = 'auto';
            expected.type = 'auto';

            const actual = esToKibana(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should map [float] type correctly', () => {
            source.type = 'float';
            expected.type = 'number';

            const actual = esToKibana(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should map [string] type correctly', () => {
            source.type = 'string';
            expected.type = 'string';

            const actual = esToKibana(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should map [boolean] type correctly', () => {
            source.type = 'boolean';
            expected.type = 'boolean';

            const actual = esToKibana(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

        });

      });

    });

  });

});

