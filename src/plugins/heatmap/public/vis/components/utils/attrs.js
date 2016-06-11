import _ from 'lodash';
import builder from 'plugins/heatmap/vis/components/utils/builder';

function attrs(generator) {
  return function () {
    var funcs = _.toArray(arguments);

    function filterFunctions(arr, attr) {
      return _.filter(arr, function (func) {
        return _.isFunction(func[attr]);
      });
    }

    function getValue(arr, attr) {
      if (!arr.length) { return; }

      if (arr.length === 1) { return arr[0][attr](); }

      return _.map(arr, function (func) {
        return func[attr]();
      });
    }

    return function (attr, value) {
      if (_.isString(attr)) {
        if (!value) {
          return getValue(filterFunctions(funcs, attr), attr);
        }

        _.forEach(filterFunctions(funcs, attr), function (func) {
          func[attr](value);
        });
      }

      if (!value && _.isPlainObject(attr)) {
        _.forEach(funcs, function (func) {
          builder(attr, func);
        });
      }

      return generator;
    };
  };
};

export default attrs;
