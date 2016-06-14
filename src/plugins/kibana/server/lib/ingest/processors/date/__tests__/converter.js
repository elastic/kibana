import expect from 'expect.js';
import _ from 'lodash';
import { kibanaToEs, esToKibana } from '../converter';

describe('ingest', () => {

  describe('processors', () => {

    describe('converters', () => {

      describe('date', () => {

        describe('kibanaToEs', () => {

          let source;
          let expected;
          beforeEach(function () {
            source = {
              processor_id: 'foo_processor_id',
              source_field: 'foo_source_field',
              target_field: 'foo_target_field',
              formats: [ 'format1', 'format2' ],
              timezone: 'foo_timezone',
              locale: 'foo_locale'
            };

            expected = {
              date: {
                tag: 'foo_processor_id',
                field: 'foo_source_field',
                target_field: 'foo_target_field',
                formats: [ 'format1', 'format2' ],
                timezone: 'foo_timezone',
                locale: 'foo_locale'
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

          it('should add a custom format to the list of formats', () => {
            source.formats.push('custom');
            source.custom_format = 'foo_custom_format';
            expected.date.formats.push('foo_custom_format');

            const actual = kibanaToEs(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

        });

        describe('esToKibana', () => {

          let source;
          let expected;
          beforeEach(function () {
            source = {
              date: {
                tag: 'foo_tag',
                field: 'foo_field',
                target_field: 'foo_target_field',
                formats: [ 'iso8601', 'unix', 'unix_ms', 'tai64n' ],
                timezone: 'foo_timezone',
                locale: 'foo_locale'
              }
            };

            expected = {
              typeId: 'date',
              processor_id: 'foo_tag',
              source_field: 'foo_field',
              target_field: 'foo_target_field',
              formats: [ 'ISO8601', 'UNIX', 'UNIX_MS', 'TAI64N' ],
              custom_format: '',
              timezone: 'foo_timezone',
              locale: 'foo_locale',
            };
          });

          it('should convert from an elasticsearch object to a kibana api object', () => {
            const actual = esToKibana(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should ignore additional source fields', () => {
            source.date.foo = 'bar';
            source.date.bar = 'baz';

            const actual = esToKibana(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should treat any unknown formats as a custom format', () => {
            source.date.formats.push('foo');
            expected.formats.push('CUSTOM');
            expected.custom_format = 'foo';

            const actual = esToKibana(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should use the last custom format if multiple are specified', () => {
            source.date.formats.push('foo');
            source.date.formats.push('bar');
            expected.formats.push('CUSTOM');
            expected.custom_format = 'bar';

            const actual = esToKibana(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should throw an error if argument does not have an [date] property', () => {
            const errorMessage = /elasticsearch processor document missing \[date\] property/i;

            source.foo = _.clone(source.date);
            delete source.date;
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
