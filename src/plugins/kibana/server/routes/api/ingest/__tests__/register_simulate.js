import { handleError, handleResponse } from '../register_simulate';
import expect from 'expect.js';
import _ from 'lodash';

describe('api', () => {

  describe('ingest', () => {

    describe('register_simulate', () => {

      describe('handleError', () => {

        it('result will be returned for processor that threw the error', function () {
          const error = _.set({}, 'body.error.root_cause[0].reason', 'foobar');
          _.set(error, 'body.error.root_cause[0].header.processor_tag', 'processor1');

          const expected = [
            { processorId: 'processor1', error: { compile: true, message: 'foobar' } }
          ];
          const actual = handleError(error);

          expect(_.isEqual(actual, expected)).to.be.ok();
        });

      });

      describe('handleResponse', () => {

        it('each processor that receives a result will contain response info', function () {
          const response = {
            docs: [ { processor_results: [
              { tag: 'processor1', doc: { _source: 'new_foo' }, error: undefined },
              { tag: 'processor2', doc: { _source: 'new_bar' }, error: undefined },
              { tag: 'processor3', doc: { _source: 'new_baz' }, error: undefined }
            ] } ]
          };

          const expected = [
            { processorId: 'processor1', output: 'new_foo', error: undefined },
            { processorId: 'processor2', output: 'new_bar', error: undefined },
            { processorId: 'processor3', output: 'new_baz', error: undefined }
          ];
          const actual = handleResponse(response);

          expect(actual).to.eql(expected);
        });

        describe('processors that return an error object', function () {

          it('will be the root_cause reason if one exists', function () {
            const response = {
              docs: [ { processor_results: [
                { tag: 'processor1', doc: { _source: 'new_foo' }, error: undefined },
                {
                  tag: 'processor2',
                  doc: 'dummy',
                  error: { root_cause: [ { reason: 'something bad happened', type: 'general exception' } ] }
                }
              ] } ]
            };

            const expected = [
              { processorId: 'processor1', output: 'new_foo', error: undefined },
              { processorId: 'processor2', output: undefined, error: { compile: false, message: 'something bad happened'} }
            ];
            const actual = handleResponse(response);

            expect(actual).to.eql(expected);
          });

          it('will be the root_cause type if reason does not exists', function () {
            const response = {
              docs: [ { processor_results: [
                { tag: 'processor2', doc: { _source: 'new_bar' }, error: undefined },
                {
                  tag: 'processor3',
                  doc: 'dummy',
                  error: { root_cause: [ { type: 'something bad happened' } ] }
                }
              ] } ]
            };

            const expected = [
              { processorId: 'processor2', output: 'new_bar', error: undefined },
              { processorId: 'processor3', output: undefined, error: { compile: false, message: 'something bad happened'} }
            ];
            const actual = handleResponse(response);

            expect(actual).to.eql(expected);
          });

        });

      });

    });

  });

});
