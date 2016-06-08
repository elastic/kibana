import expect from 'expect.js';
import _ from 'lodash';
import simulateConverter from '../converter';

describe('ingestSimulateApiKibanaToEsConverter', function () {

  describe('kibanaToEs', () => {

    it('populates the docs._source section and converts known processors', function () {

      function buildSamplePipeline(input) {
        return {
          processors: [ { processor_id: 'processor1', type_id: 'set', target_field: 'bar', value: 'foo', ignore_failure: false } ],
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
                value: 'foo',
                ignore_failure: false
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
      actual = simulateConverter.kibanaToEs(buildSamplePipeline(undefined));
      expect(actual).to.eql(expected);

      expected = buildExpected('foo');
      actual = simulateConverter.kibanaToEs(buildSamplePipeline('foo'));
      expect(actual).to.eql(expected);

      expected = buildExpected({ foo: 'bar' });
      actual = simulateConverter.kibanaToEs(buildSamplePipeline({ foo: 'bar' }));
      expect(actual).to.eql(expected);
    });

    it('handles multiple processors', function () {
      const pipeline = {
        processors: [
          { processor_id: 'processor1', type_id: 'set', target_field: 'bar', value: 'foo', ignore_failure: false },
          { processor_id: 'processor2', type_id: 'set', target_field: 'bar', value: 'foo', ignore_failure: false },
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
                value: 'foo',
                ignore_failure: false
              }
            },
            {
              set: {
                field: 'bar',
                tag: 'processor2',
                value: 'foo',
                ignore_failure: false
              }
            }
          ]
        },
        'docs': [
          {'_source': {}}
        ]
      };

      const actual = simulateConverter.kibanaToEs(pipeline);

      expect(actual).to.eql(expected);
    });

  });

  describe('esToKibana', () => {

    it('should throw a not implemented error', () => {
      expect(simulateConverter.esToKibana).to.throwException(/not implemented/i);
    });

  });

});
