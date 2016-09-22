import expect from 'expect.js';
import { set, isEqual } from 'lodash';
import converterProvider from '../converter';

const baseConverter = {
  kibanaToEs: (doc, typeId) => {
    return set({}, typeId, {});
  },
  esToKibana: (doc, typeId) => {
    return {};
  }
};

const mockServer = {};
set(mockServer, 'plugins.kibana.pipelines.processors.baseConverter', baseConverter);

const converter = converterProvider(mockServer);

describe('pipelines', () => {

  describe('processors', () => {

    describe('set', () => {

      describe('converter', () => {

        describe('kibanaToEs', () => {

          let source;
          let expected;
          beforeEach(function () {
            source = {
              target_field: 'foo_target_field',
              value: 'foo_value'
            };

            expected = {
              set: {
                field: 'foo_target_field',
                value: 'foo_value'
              }
            };
          });

          it('should convert from a kibana api object to an elasticsearch object', () => {
            const actual = converter.kibanaToEs(source);
            expect(isEqual(actual, expected)).to.be.ok();
          });

          it('should ignore additional source fields', () => {
            source.foo = 'bar';
            source.bar = 'baz';

            const actual =  converter.kibanaToEs(source);
            expect(isEqual(actual, expected)).to.be.ok();
          });

        });

        describe('esToKibana', () => {

          let source;
          let expected;
          beforeEach(function () {
            source = {
              set: {
                field: 'foo_field',
                value: 'foo_value'
              }
            };

            expected = {
              target_field: 'foo_field',
              value: 'foo_value'
            };
          });

          it('should convert from an elasticsearch object to a kibana api object', () => {
            const actual = converter.esToKibana(source);
            expect(isEqual(actual, expected)).to.be.ok();
          });

          it('should ignore additional source fields', () => {
            source.set.foo = 'bar';
            source.set.bar = 'baz';

            const actual = converter.esToKibana(source);
            expect(isEqual(actual, expected)).to.be.ok();
          });

        });

      });

    });

  });

});
