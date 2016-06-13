import expect from 'expect.js';
import _ from 'lodash';
import { kibanaToEs, esToKibana } from '../converter';

describe('ingest', () => {

  describe('processors', () => {

    describe('converters', () => {

      describe('geoip', () => {

        describe('kibanaToEs', () => {

          let source;
          let expected;
          beforeEach(function () {
            source = {
              processor_id: 'foo_processor_id',
              source_field: 'foo_source_field'
            };

            expected = {
              geoip: {
                tag: 'foo_processor_id',
                field: 'foo_source_field'
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

          it('should populate [target_field] if [target_field] defined in source doc', () => {
            source.target_field = 'foo_target_field';
            expected.geoip.target_field = 'foo_target_field';

            const actual = kibanaToEs(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should populate [database_file] if [database_file] defined in source doc', () => {
            source.database_file = 'foo_database_file';
            expected.geoip.database_file = 'foo_database_file';

            const actual = kibanaToEs(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should populate [properties] if [database_fields] defined in source doc', () => {
            source.database_fields = 'foo_database_fields';
            expected.geoip.properties = 'foo_database_fields';

            const actual = kibanaToEs(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

        });

        describe('esToKibana', () => {

          let source;
          let expected;
          beforeEach(function () {
            source = {
              geoip: {
                tag: 'foo_tag',
                field: 'foo_field',
                target_field: 'foo_target_field',
                database_file: 'foo_database_file',
                properties: 'foo_properties'
              }
            };

            expected = {
              typeId: 'geoip',
              processor_id: 'foo_tag',
              source_field: 'foo_field',
              target_field: 'foo_target_field',
              database_file: 'foo_database_file',
              database_fields: 'foo_properties'
            };
          });

          it('should convert from an elasticsearch object to a kibana api object', () => {
            const actual = esToKibana(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should ignore additional source fields', () => {
            source.geoip.foo = 'bar';
            source.geoip.bar = 'baz';

            const actual = esToKibana(source);
            expect(_.isEqual(actual, expected)).to.be.ok();
          });

          it('should throw an error if argument does not have an [geoip] property', () => {
            const errorMessage = /elasticsearch processor document missing \[geoip\] property/i;

            source.foo = _.clone(source.geoip);
            delete source.geoip;
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
