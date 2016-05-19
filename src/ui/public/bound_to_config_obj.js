import _ from 'lodash';
export default function BoundToConfigObjProvider(config) {

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

    _.forOwn(input, function (value, prop) {
      if (!_.isString(value) || value.charAt(0) !== '=') {
        self[prop] = value;
        return;
      }

      const configKey = value.substr(1);

      config.watch(configKey, function update(value) {
        self[prop] = value;
      });
    });
  }

  return BoundToConfigObj;

};
