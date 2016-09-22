import expect from 'expect.js';
import { set, isEqual } from 'lodash';
import converterProvider from '../converter';

function makeConverter(typeId) {
  return {
    kibanaToEs: (doc) => {
      return set({}, 'action', `kibanaToEs with a ${typeId} converter`);
    },
    esToKibana: (doc) => {
      return set({}, 'action', `esToKibana with a ${typeId} converter`);
    }
  };
}

const converters = {};
set(converters, 'foo', makeConverter('foo'));
set(converters, 'bar', makeConverter('bar'));

const mockServer = {};
set(mockServer, 'plugins.kibana.pipelines.processors.converters', converters);

const converter = converterProvider(mockServer);


describe('pipelines', () => {

  describe('processor_array', () => {

    describe('converter', () => {

      describe('kibanaToEs', () => {

        let source;
        let expected;
        beforeEach(function () {
          source = [
            { type_id: 'foo' },
            { type_id: 'bar' },
            { type_id: 'foo' }
          ];

          expected = [
            { action: 'kibanaToEs with a foo converter' },
            { action: 'kibanaToEs with a bar converter' },
            { action: 'kibanaToEs with a foo converter' }
          ];
        });

        it('loop through the processors and call kibanaToEs in their converters', () => {
          const actual = converter.kibanaToEs(source);
          expect(isEqual(actual, expected)).to.be.ok();
        });

        it('should throw exception with unknown processor type', () => {
          source.push({ type_id: 'baz' });

          expect(converter.kibanaToEs).withArgs(source)
            .to.throwException(/Unknown processor type: \[baz\]/);
        });

      });

      describe('esToKibana', () => {

        let source;
        let expected;
        beforeEach(function () {
          source = [
            { bar: {} },
            { foo: {} },
            { bar: {} }
          ];

          expected = [
            { action: 'esToKibana with a bar converter' },
            { action: 'esToKibana with a foo converter' },
            { action: 'esToKibana with a bar converter' }
          ];
        });

        it('loop through the processors and call esToKibana in their converters', () => {
          const actual = converter.esToKibana(source);
          expect(isEqual(actual, expected)).to.be.ok();
        });

        it('should throw exception with unknown processor type', () => {
          source.push({ 'baz': {} });

          expect(converter.esToKibana).withArgs(source)
            .to.throwException(/Unknown processor type: \[baz\]/);
        });

      });

    });

  });

});
