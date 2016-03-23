import processESIngestSimulateResponse from '../process_es_ingest_simulate_response';
import expect from 'expect.js';
import _ from 'lodash';

describe('processESIngestSimulateResponse', function () {

  it('returns a result for each processor in the pipeline', function () {
    const processors = [ { processorId: 'processor1' }, { processorId: 'processor2' } ];
    const response = {
      docs: [ { processor_results: [] } ]
    };

    const results = processESIngestSimulateResponse(processors, response);
    expect(results.length).to.be(2);
  });

  it('each processor that does not receive a result will contain default info', function () {
    const processors = [
      { processorId: 'processor1', outputObject: 'foo' },
      { processorId: 'processor2', outputObject: 'bar' },
      { processorId: 'processor3', outputObject: 'baz' }
    ];
    const response = {
      docs: [ { processor_results: [] } ]
    };

    const expected = [
      { processorId: 'processor1', output: 'foo', error: undefined },
      { processorId: 'processor2', output: 'bar', error: undefined },
      { processorId: 'processor3', output: 'baz', error: undefined }
    ];
    const actual = processESIngestSimulateResponse(processors, response);

    expect(actual).to.eql(expected);
  });

  it('each processor that receives a result will contain response info', function () {
    const processors = [
      { processorId: 'processor1', outputObject: 'foo' },
      { processorId: 'processor2', outputObject: 'bar' },
      { processorId: 'processor3', outputObject: 'baz' }
    ];
    const response = {
      docs: [ { processor_results: [
        { tag: 'processor2', doc: { _source: 'new_bar' }, error: undefined },
        { tag: 'processor3', doc: { _source: 'new_baz' }, error: undefined }
      ] } ]
    };

    const expected = [
      { processorId: 'processor1', output: 'foo', error: undefined },
      { processorId: 'processor2', output: 'new_bar', error: undefined },
      { processorId: 'processor3', output: 'new_baz', error: undefined }
    ];
    const actual = processESIngestSimulateResponse(processors, response);

    expect(actual).to.eql(expected);
  });

  describe('processors that return an error object', function () {

    it('will be the root_cause reason if one exists', function () {
      const processors = [
        { processorId: 'processor1', outputObject: 'foo' },
        { processorId: 'processor2', outputObject: 'bar' },
        { processorId: 'processor3', outputObject: 'baz' }
      ];
      const response = {
        docs: [ { processor_results: [
          { tag: 'processor2', doc: { _source: 'new_bar' }, error: undefined },
          {
            tag: 'processor3',
            doc: 'dummy',
            error: { root_cause: [ { reason: 'something bad happened', type: 'general exception' } ] }
          }
        ] } ]
      };

      const expected = [
        { processorId: 'processor1', output: 'foo', error: undefined },
        { processorId: 'processor2', output: 'new_bar', error: undefined },
        { processorId: 'processor3', output: undefined, error: { isNested: false, message: 'something bad happened'} }
      ];
      const actual = processESIngestSimulateResponse(processors, response);

      expect(actual).to.eql(expected);
    });

    it('will be the root_cause type if reason does not exists', function () {
      const processors = [
        { processorId: 'processor1', outputObject: 'foo' },
        { processorId: 'processor2', outputObject: 'bar' },
        { processorId: 'processor3', outputObject: 'baz' }
      ];
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
        { processorId: 'processor1', output: 'foo', error: undefined },
        { processorId: 'processor2', output: 'new_bar', error: undefined },
        { processorId: 'processor3', output: undefined, error: { isNested: false, message: 'something bad happened'} }
      ];
      const actual = processESIngestSimulateResponse(processors, response);

      expect(actual).to.eql(expected);
    });

    it('any processor after errored processor will be set to a nested error state', function () {
      const processors = [
        { processorId: 'processor0', outputObject: 'oof' },
        { processorId: 'processor1', outputObject: 'foo' },
        { processorId: 'processor2', outputObject: 'bar' },
        { processorId: 'processor3', outputObject: 'baz' }
      ];
      const response = {
        docs: [
          {
            processor_results: [
              { tag: 'processor0', doc: { _source: 'new_oof' }, error: undefined },
              {
                tag: 'processor1',
                doc: 'dummy',
                error: { root_cause: [ { reason: 'something bad happened' } ] }
              }
            ]
          }
        ]
      };

      const expected = [
        { processorId: 'processor0', output: 'new_oof', error: undefined },
        { processorId: 'processor1', output: undefined, error: { isNested: false, message: 'something bad happened' } },
        { processorId: 'processor2', output: undefined, error: { isNested: true, message: 'Invalid Parent Processor' } },
        { processorId: 'processor3', output: undefined, error: { isNested: true, message: 'Invalid Parent Processor' } }
      ];
      const actual = processESIngestSimulateResponse(processors, response);

      expect(actual).to.eql(expected);
    });

  });


});
