import processESIngestSimulateError from '../process_es_ingest_simulate_error';
import expect from 'expect.js';
import _ from 'lodash';

describe('processESIngestSimulateError', function () {

  it('result will be returned for processor that threw the error', function () {
    const error = _.set({}, 'body.error.root_cause[0].reason', 'foobar');
    _.set(error, 'body.error.root_cause[0].header.processor_tag', 'processor1');

    const expected = [
      { processorId: 'processor1', error: { compile: true, message: 'foobar' } }
    ];
    const actual = processESIngestSimulateError(error);

    expect(_.isEqual(actual, expected)).to.be.ok();
  });

});
