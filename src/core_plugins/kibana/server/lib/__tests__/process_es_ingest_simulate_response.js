import processESIngestSimulateResponse from '../process_es_ingest_simulate_response';
import expect from 'expect.js';
import _ from 'lodash';

describe('processESIngestSimulateResponse', function () {

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
    const actual = processESIngestSimulateResponse(response);

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
      const actual = processESIngestSimulateResponse(response);

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
      const actual = processESIngestSimulateResponse(response);

      expect(actual).to.eql(expected);
    });

  });


});
