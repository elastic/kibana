import processESIngestSimulateError from '../process_es_ingest_simulate_error';
import expect from 'expect.js';
import _ from 'lodash';

describe('processESIngestSimulateError', function () {

  it('result will be returned for processor that threw the error', function () {
    const error = _.set({}, 'body.error.reason', 'foobar');

    const expected = [
      { processorId: 'processor1', error: { compile: true, message: 'foobar' } }
    ];
    const actual = processESIngestSimulateError(error);

    expect(_.isEqual(actual, expected)).to.be.ok();
  });

});
