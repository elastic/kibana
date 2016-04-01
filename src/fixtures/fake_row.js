define(function (require) {
  let _ = require('lodash');
  let longString = Array(200).join('_');

  return function (id, mapping) {
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
  };
});
