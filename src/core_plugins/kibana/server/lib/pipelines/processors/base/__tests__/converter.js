import expect from 'expect.js';
import { set, isEqual } from 'lodash';
import converterProvider from '../converter';

const barConverter = {
  kibanaToEs: () => {
    return { wiz: 'bang' };
  },
  esToKibana: () => {
    return { wiz: 'bang' };
  }
};
const mockServer = {};
set(mockServer, `plugins.kibana.pipelines.processors.converters`, { bar: barConverter });

const converter = converterProvider(mockServer);

describe('pipelines', () => {

  describe('processors', () => {

    describe('base', () => {

      describe('converter', () => {

        describe('kibanaToEs', () => {

          let source;
          let expected;
          beforeEach(function () {
            source = {
              processor_id: 'foo_1',
              failure_processors: []
            };

            expected = {
              foo: {
                tag: 'foo_1'
              }
            };
          });

          it('should convert from a kibana api object to an elasticsearch object', () => {
            const actual = converter.kibanaToEs(source, 'foo');
            expect(isEqual(actual, expected)).to.be.ok();
          });

          describe('should correctly set failure_action property', () => {

            it('ignore_error', () => {
              set(source, 'failure_action', 'ignore_error');
              set(expected, 'foo.ignore_failure', true);

              const actual = converter.kibanaToEs(source, 'foo');
              expect(isEqual(actual, expected)).to.be.ok();
            });

            it('index_fail', () => {
              set(source, 'failure_action', 'index_fail');

              const actual = converter.kibanaToEs(source, 'foo');
              expect(isEqual(actual, expected)).to.be.ok();
            });

            it('on_error with no failure_processors defined', () => {
              set(source, 'failure_action', 'on_error');

              const actual = converter.kibanaToEs(source, 'foo');
              expect(isEqual(actual, expected)).to.be.ok();
            });

            it('undefined', () => {
              const actual = converter.kibanaToEs(source, 'foo');
              expect(isEqual(actual, expected)).to.be.ok();
            });

            it('any other val', () => {
              set(source, 'failure_action', 'foo');

              const actual = converter.kibanaToEs(source, 'foo');
              expect(isEqual(actual, expected)).to.be.ok();
            });

          });

          it('should populate the on_failure property properly', () => {
            set(source, 'failure_action', 'on_error');
            set(source, 'failure_processors', [ { type_id: 'bar' }]);
            set(expected, 'foo.on_failure', [ { wiz: 'bang' } ]);

            const actual = converter.kibanaToEs(source, 'foo');
            expect(isEqual(actual, expected)).to.be.ok();
          });

        });

        describe('esToKibana', () => {

          let source;
          let expected;
          beforeEach(function () {
            source = {
              foo: {
                tag: 'foo_1'
              }
            };

            expected = {
              type_id: 'foo',
              processor_id: 'foo_1',
              failure_processors: [],
              failure_action: 'index_fail'
            };
          });

          it('should convert from an elasticsearch object to a kibana api object', () => {
            const actual = converter.esToKibana(source, 'foo');
            expect(isEqual(actual, expected)).to.be.ok();
          });

          it('should check the first property of source object', () => {
            expect(converter.esToKibana).withArgs(source, 'foo')
              .to.not.throwException();

            expect(converter.esToKibana).withArgs(source, 'bar')
              .to.throwException(/missing \[bar\] property/);
          });

          it('use processorArrayConverter to populate failure_processors', () => {
            set(expected, 'failure_action', 'on_error');
            set(expected, 'failure_processors', [ { wiz: 'bang' } ]);
            set(source, 'foo.on_failure', [ { bar: {} }]);
            const actual = converter.esToKibana(source, 'foo');

            expect(isEqual(actual, expected)).to.be.ok();
          });

          describe('should populate failure_action correctly', () => {

            it('on_error', () => {
              set(source, 'foo.on_failure', [ { bar: {} }]);
              const actual = converter.esToKibana(source, 'foo');

              expect(actual.failure_action).to.equal('on_error');
            });

            it('ignore_error', () => {
              set(source, 'foo.ignore_failure', true);
              const actual = converter.esToKibana(source, 'foo');

              expect(actual.failure_action).to.equal('ignore_error');
            });

            it('index_fail', () => {
              const actual = converter.esToKibana(source, 'foo');

              expect(actual.failure_action).to.equal('index_fail');
            });

          });

        });

      });

    });

  });

});
