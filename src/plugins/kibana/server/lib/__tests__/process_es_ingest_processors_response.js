import processESIngestProcessorsResponse from '../process_es_ingest_processors_response';
import expect from 'expect.js';
import _ from 'lodash';

describe('processESIngestSimulateResponse', function () {

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
    const actual = processESIngestProcessorsResponse(response);

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
    const actual = processESIngestProcessorsResponse(response);

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
    const actual = processESIngestProcessorsResponse(response);

    expect(_.isEqual(actual, expected)).to.be.ok();
  });

  it('should return an empty array for unexpected response', function () {
    expect(_.isEqual(processESIngestProcessorsResponse({ nodes: {}}), [])).to.be.ok();
    expect(_.isEqual(processESIngestProcessorsResponse({}), [])).to.be.ok();
    expect(_.isEqual(processESIngestProcessorsResponse(undefined), [])).to.be.ok();
    expect(_.isEqual(processESIngestProcessorsResponse(null), [])).to.be.ok();
    expect(_.isEqual(processESIngestProcessorsResponse(''), [])).to.be.ok();
    expect(_.isEqual(processESIngestProcessorsResponse(1), [])).to.be.ok();
  });

});
