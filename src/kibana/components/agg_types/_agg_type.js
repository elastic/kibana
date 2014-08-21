define(function (require) {
  return function AggTypeFactory(Private) {
    var _ = require('lodash');
    var AggParams = Private(require('components/agg_types/_agg_params'));

    function AggType(config) {
      this.name = config.name;
      this.title = config.title;
      this.makeLabel = config.makeLabel || _.constant(this.name);

      var params = this.params = config.params || [];

      if (!(params instanceof AggParams)) {
        if (_.isPlainObject(params)) {
          // convert the names: details format into details[].name
          params = _.map(params, function (param, name) {
            param.name = name;
            return param;
          });
        }

        params = this.params = new AggParams(params);
      }
    }

    return AggType;
  };
});