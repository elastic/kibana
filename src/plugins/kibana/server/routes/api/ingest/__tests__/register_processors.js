import { handleResponse } from '../register_processors';
import expect from 'expect.js';
import _ from 'lodash';

describe('api', () => {

  describe('ingest', () => {

    describe('register_processors', () => {

      describe('handleResponse', function () {

        it('should return a list of strings indicating the enabled processors', function () {
          const response = {
            nodes: {
              node_foo: {
                ingest: {
                  processors: [
                    { type: 'proc_foo' },
                    { type: 'proc_bar' }
                  ]
                }
              }
            }
          };

          const expected = [ 'proc_foo', 'proc_bar' ];
          const actual = handleResponse(response);

          expect(_.isEqual(actual, expected)).to.be.ok();
        });

        it('should return a unique list of processors', function () {
          const response = {
            nodes: {
              node_foo: {
                ingest: {
                  processors: [
                    { type: 'proc_foo' },
                    { type: 'proc_bar' }
                  ]
                }
              },
              node_bar: {
                ingest: {
                  processors: [
                    { type: 'proc_foo' },
                    { type: 'proc_bar' }
                  ]
                }
              }
            }
          };

          const expected = [ 'proc_foo', 'proc_bar' ];
          const actual = handleResponse(response);

          expect(_.isEqual(actual, expected)).to.be.ok();
        });

        it('should combine the available processors from all nodes', function () {
          const response = {
            nodes: {
              node_foo: {
                ingest: {
                  processors: [
                    { type: 'proc_foo' }
                  ]
                }
              },
              node_bar: {
                ingest: {
                  processors: [
                    { type: 'proc_bar' }
                  ]
                }
              }
            }
          };

          const expected = [ 'proc_foo', 'proc_bar' ];
          const actual = handleResponse(response);

          expect(_.isEqual(actual, expected)).to.be.ok();
        });

        it('should return an empty array for unexpected response', function () {
          expect(_.isEqual(handleResponse({ nodes: {}}), [])).to.be.ok();
          expect(_.isEqual(handleResponse({}), [])).to.be.ok();
          expect(_.isEqual(handleResponse(undefined), [])).to.be.ok();
          expect(_.isEqual(handleResponse(null), [])).to.be.ok();
          expect(_.isEqual(handleResponse(''), [])).to.be.ok();
          expect(_.isEqual(handleResponse(1), [])).to.be.ok();
        });

      });

    });

  });

});
