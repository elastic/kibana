import _ from 'lodash';
const longString = Array(200).join('_');

export default function (id, mapping) {
  function fakeVals(type) {
    return _.mapValues(mapping, function (f, c) {
      return c + '_' + type + '_' + id + longString;
    });
  }

  return {
    _id: id,
    _index: 'test',
    _source: fakeVals('original'),
    sort: [id],
    $$_formatted: fakeVals('formatted'),
    $$_partialFormatted: fakeVals('formatted'),
    $$_flattened: fakeVals('_flattened')
  };
}
