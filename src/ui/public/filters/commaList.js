define(function (require) {
  let _ = require('lodash');

  require('ui/modules')
  .get('kibana')
  .filter('commaList', function () {
    /**
     * Angular filter that accepts either an array or a comma-seperated string
     * and outputs either an array, or a comma-seperated string for presentation.
     *
     * @param {String|Array} input - The comma-seperated list or array
     * @param {Boolean} inclusive - Should the list be joined with an "and"?
     * @return {String}
     */
    return function (input, inclusive) {
      let list = _.commaSeperatedList(input);
      if (list.length < 2) {
        return list.join('');
      }

      let conj = inclusive ? ' and ' : ' or ';
      return list.slice(0, -1).join(', ') + conj + _.last(list);

    };
  });
});
