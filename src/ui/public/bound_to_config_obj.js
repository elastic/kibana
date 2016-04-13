define(function (require) {
  return function BoundToConfigObjProvider($rootScope, config) {
    const _ = require('lodash');

    /**
     * Create an object with properties that may be bound to config values.
     * The input object is basically cloned unless one of it's own properties
     * resolved to a string value that starts with an equal sign. When that is
     * found, that property is forever bound to the corresponding config key.
     *
     * example:
     *
     * // name is cloned, height is bound to the defaultHeight config key
     * { name: 'john', height: '=defaultHeight' };
     *
     * @param  {Object} input
     * @return {Object}
     */
    function BoundToConfigObj(input) {
      const self = this;

      _.forOwn(input, function (val, prop) {
        if (!_.isString(val) || val.charAt(0) !== '=') {
          self[prop] = val;
          return;
        }

        const configKey = val.substr(1);

        update();
        $rootScope.$on('init:config', update);
        $rootScope.$on('change:config.' + configKey, update);
        function update() {
          self[prop] = config.get(configKey);
        }

      });
    }

    return BoundToConfigObj;

  };
});
