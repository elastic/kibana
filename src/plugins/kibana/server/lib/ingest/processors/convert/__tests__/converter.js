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

          it('should map type [number] to [float]', () => {
            source.type = 'number';
            expected.convert.type = 'float';

            const actual = kibanaToEs(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should leave basic types unmodified', () => {
            source.type = 'auto';
            expected.convert.type = 'auto';
            expect(_.isEqual(kibanaToEs(source), expected)).to.be.ok();

            source.type = 'string';
            expected.convert.type = 'string';
            expect(_.isEqual(kibanaToEs(source), expected)).to.be.ok();

            source.type = 'boolean';
            expected.convert.type = 'boolean';
            expect(_.isEqual(kibanaToEs(source), expected)).to.be.ok();
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

          it('should map type [double], [float], [integer], [long], [short] to [number]', () => {
            source.type = 'double';
            expected.type = 'number';
            expect(_.isEqual(esToKibana(source), expected)).to.be.ok();

            source.type = 'float';
            expected.type = 'number';
            expect(_.isEqual(esToKibana(source), expected)).to.be.ok();

            source.type = 'integer';
            expected.type = 'number';
            expect(_.isEqual(esToKibana(source), expected)).to.be.ok();

            source.type = 'long';
            expected.type = 'number';
            expect(_.isEqual(esToKibana(source), expected)).to.be.ok();

            source.type = 'short';
            expected.type = 'number';
            expect(_.isEqual(esToKibana(source), expected)).to.be.ok();

          });

          it('should leave basic types unmodified', () => {
            source.type = 'auto';
            expected.type = 'auto';
            expect(_.isEqual(esToKibana(source), expected)).to.be.ok();

            source.type = 'string';
            expected.type = 'string';
            expect(_.isEqual(esToKibana(source), expected)).to.be.ok();

            source.type = 'boolean';
            expected.type = 'boolean';
            expect(_.isEqual(esToKibana(source), expected)).to.be.ok();
          });

        });

      });

    });

  });

});

