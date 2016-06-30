import expect from 'expect.js';
import _ from 'lodash';
import ingestSimulateApiKibanaToEsConverter from '../../converters/ingest_simulate_api_kibana_to_es_converter';

describe('ingestSimulateApiKibanaToEsConverter', function () {

  it('populates the docs._source section and converts known processors', function () {

    function buildSamplePipeline(input) {
      return {
        processors: [ { processor_id: 'processor1', type_id: 'set', target_field: 'bar', value: 'foo' } ],
        input: input
      };
    }

    function buildExpected(input) {
      return {
        pipeline : {
          processors: [{
            set: {
              field: 'bar',
              tag: 'processor1',
              value: 'foo'
            }
          }]
        },
        'docs' : [
          { '_source': input }
        ]
      };
    }

    let expected;
    let actual;

    expected = buildExpected(undefined);
    actual = ingestSimulateApiKibanaToEsConverter(buildSamplePipeline(undefined));
    expect(actual).to.eql(expected);

    expected = buildExpected('foo');
    actual = ingestSimulateApiKibanaToEsConverter(buildSamplePipeline('foo'));
    expect(actual).to.eql(expected);

    expected = buildExpected({ foo: 'bar' });
    actual = ingestSimulateApiKibanaToEsConverter(buildSamplePipeline({ foo: 'bar' }));
    expect(actual).to.eql(expected);
  });

  it('handles multiple processors', function () {
    const pipeline = {
      processors: [
        { processor_id: 'processor1', type_id: 'set', target_field: 'bar', value: 'foo' },
        { processor_id: 'processor2', type_id: 'set', target_field: 'bar', value: 'foo' },
      ],
      input: {}
    };
    const expected = {
      'pipeline': {
        'processors': [
          {
            set: {
              field: 'bar',
              tag: 'processor1',
              value: 'foo'
            }
          },
          {
            set: {
              field: 'bar',
              tag: 'processor2',
              value: 'foo'
            }
          }
        ]
      },
      'docs': [
        {'_source': {}}
      ]
    };

    const actual = ingestSimulateApiKibanaToEsConverter(pipeline);

    expect(actual).to.eql(expected);
  });


});
