import processESIngestSimulateError from '../process_es_ingest_simulate_error';
import expect from 'expect.js';
import _ from 'lodash';

describe('processESIngestSimulateError', function () {

  it('result will be returned for processor that threw the error', function () {
    const dirtyProcessorId = 'processor1';
    const error = _.set({}, 'body.error.reason', 'foobar');

    const expected = [
      { processorId: 'processor1', error: { compile: true, message: 'foobar' } }
    ];
    const actual = processESIngestSimulateError(dirtyProcessorId, error);

    expect(actual).to.eql(expected);
  });

});
