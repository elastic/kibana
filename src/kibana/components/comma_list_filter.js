define(function (require) {
  var _ = require('lodash');

  require('modules')
  .get('kibana')
  .filter('commaList', function () {
    return function (input, inclusive) {
      var list = _.commaSeperatedList(input);
      if (list.length < 2) {
        return list.join('');
      }

      var conj = inclusive ? ' and ' : ' or ';
      return list.slice(0, -1).join(', ') + conj + _.last(list);

    };
  });
});
