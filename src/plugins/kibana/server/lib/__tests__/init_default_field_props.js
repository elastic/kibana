import initDefaultFieldProps from '../init_default_field_props';
import expect from 'expect.js';
import _ from 'lodash';
let fields;

const testData = [
  {
    'name': 'ip',
    'type': 'ip'
  }, {
    'name': '@timestamp',
    'type': 'date'
  }, {
    'name': 'agent',
    'type': 'string'
  }, {
    'name': 'bytes',
    'type': 'number'
  },
  {
    'name': 'geo.coordinates',
    'type': 'geo_point'
  }
];

describe('initDefaultFieldProps', function () {

  beforeEach(function () {
    fields = _.cloneDeep(testData);
  });

  it('should throw an error if no argument is passed or the argument is not an array', function () {
    expect(initDefaultFieldProps).to.throwException(/requires an array argument/);
    expect(initDefaultFieldProps).withArgs({}).to.throwException(/requires an array argument/);
  });

  it('should set the same defaults for everything but strings', function () {
    const results = initDefaultFieldProps(fields);
    _.forEach(results, function (field) {
      if (field.type !== 'string') {
        expect(field).to.have.property('indexed', true);
        expect(field).to.have.property('analyzed', false);
        expect(field).to.have.property('doc_values', true);
        expect(field).to.have.property('scripted', false);
        expect(field).to.have.property('count', 0);
      }
    });
  });

  it('should make string fields analyzed', function () {
    const results = initDefaultFieldProps(fields);
    _.forEach(results, function (field) {
      if (field.type === 'string' && !_.contains(field.name, 'keyword')) {
        expect(field).to.have.property('indexed', true);
        expect(field).to.have.property('analyzed', true);
        expect(field).to.have.property('doc_values', false);
        expect(field).to.have.property('scripted', false);
        expect(field).to.have.property('count', 0);
      }
    });
  });

  it('should create an extra raw non-analyzed field for strings', function () {
    const results = initDefaultFieldProps(fields);
    const rawField = _.find(results, function (field) {
      return _.contains(field.name, 'keyword');
    });
    expect(rawField).to.have.property('indexed', true);
    expect(rawField).to.have.property('analyzed', false);
    expect(rawField).to.have.property('doc_values', true);
    expect(rawField).to.have.property('scripted', false);
    expect(rawField).to.have.property('count', 0);
  });

  it('should apply some overrides to metafields', function () {
    const results = initDefaultFieldProps([{name: '_source'}, {name: '_timestamp'}]);
    const expected = [
      {
        name: '_source',
        indexed: false,
        analyzed: false,
        doc_values: false,
        count: 0,
        scripted: false,
        type: '_source'
      },
      {
        name: '_timestamp',
        indexed: true,
        analyzed: false,
        doc_values: false,
        count: 0,
        scripted: false,
        type: 'date'
      }
    ];

    expect(_.isEqual(expected, results)).to.be.ok();
  });
});
