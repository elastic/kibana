const expect = require('expect.js');
const _ = require('lodash');
import { buildRequest } from '../ingest_simulate';

describe('buildRequest', function () {

  const processorTypes = [
    {
      typeId: 'simple1',
      getDefinition: function (processor) {
        return {
          'modified_value': `modified_${processor.value}`
        };
      }
    },
    {
      typeId: 'simple2',
      getDefinition: function (processor) {
        return {
          'value1': processor.value,
          'value2': `${processor.typeId}-${processor.value}`
        };
      }
    }
  ];

  it('should throw an error if no processorTypes argument is passed or the argument is not a plain object', function () {
    expect(buildRequest).to.throwException(/requires a processorTypes object array argument/);
    expect(buildRequest).withArgs('').to.throwException(/requires a processorTypes object array argument/);
    expect(buildRequest).withArgs({}).to.throwException(/requires a processorTypes object array argument/);
    expect(buildRequest).withArgs([]).to.throwException(/requires a processorTypes object array argument/);
  });

  it('should throw an error if no pipeline argument is passed or the argument is not a plain object', function () {
    expect(buildRequest).withArgs([{}], []).to.throwException(/requires a pipeline object argument/);
  });

  it('should throw an error if pipeline contains no processors', function () {
    expect(buildRequest).withArgs([{}], {}).to.throwException(/pipeline contains no processors/);
    expect(buildRequest).withArgs([{}], { processors: 'foo' }).to.throwException(/pipeline contains no processors/);
    expect(buildRequest).withArgs([{}], { processors: {} }).to.throwException(/pipeline contains no processors/);
    expect(buildRequest).withArgs([{}], { processors: [] }).to.throwException(/pipeline contains no processors/);
  });

  it('populates the docs._source section', function () {

    function buildSamplePipeline(input) {
      return {
        processors: [ { typeId: 'simple1', value: 'foo' } ],
        input: input
      };
    }

    function buildExpected(input) {
      return {
        'pipeline' : {
          'processors': [ { modified_value: 'modified_foo' } ]
        },
        'docs' : [
          { '_source': input }
        ]
      };
    }

    let expected;
    let actual;

    expected = buildExpected(undefined);
    actual = buildRequest(processorTypes, buildSamplePipeline(undefined));
    expect(actual).to.eql(expected);

    expected = buildExpected('foo');
    actual = buildRequest(processorTypes, buildSamplePipeline('foo'));
    expect(actual).to.eql(expected);

    expected = buildExpected({ foo: 'bar' });
    actual = buildRequest(processorTypes, buildSamplePipeline({ foo: 'bar' }));
    expect(actual).to.eql(expected);
  });

  describe('populates the pipeline.processors section with type.getDefinition()', function () {

    it(' - single processor type', function () {
      const pipeline = {
        processors: [ { typeId: 'simple1', value: 'foo' } ],
        input: {}
      };
      const expected = {
        'pipeline' : {
          'processors': [ { modified_value: 'modified_foo' } ]
        },
        'docs' : [
          { '_source': {} }
        ]
      };

      const actual = buildRequest(processorTypes, pipeline);

      expect(actual).to.eql(expected);
    });

    it(' - multiple of same type of processor type', function () {
      const pipeline = {
        processors: [
          { typeId: 'simple1', value: 'foo' },
          { typeId: 'simple1', value: 'bar' },
          { typeId: 'simple1', value: 'baz' }
        ],
        input: {}
      };
      const expected = {
        'pipeline' : {
          'processors': [
            { modified_value: 'modified_foo' },
            { modified_value: 'modified_bar' },
            { modified_value: 'modified_baz' }
          ]
        },
        'docs' : [
          { '_source': {} }
        ]
      };

      const actual = buildRequest(processorTypes, pipeline);

      expect(actual).to.eql(expected);
    });

    it(' - multiple processor types', function () {
      const pipeline = {
        processors: [
          { typeId: 'simple1', value: 'foo' },
          { typeId: 'simple2', value: 'bar' },
          { typeId: 'simple1', value: 'baz' }
        ],
        input: {}
      };
      const expected = {
        'pipeline' : {
          'processors': [
            { modified_value: 'modified_foo' },
            { value1: 'bar', value2: 'simple2-bar' },
            { modified_value: 'modified_baz' }
          ]
        },
        'docs' : [
          { '_source': {} }
        ]
      };

      const actual = buildRequest(processorTypes, pipeline);

      expect(actual).to.eql(expected);
    });

  });

});
