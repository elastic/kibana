var TimelionFunction = require('./timelion_function');
var _ = require('lodash');

module.exports = class Datasource extends TimelionFunction {
  constructor(name, config) {
    super(name, config);
    this.type = 'datasource';
    Object.freeze(this);
  }

  cacheKey(item) {
    return item.position.text;
  }
};