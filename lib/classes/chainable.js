var TimelionFunction = require('./timelion_function');

module.exports = class Chainable extends TimelionFunction {
  constructor(name, config) {
    super(name, config);
    this.type = 'chainable';
    Object.freeze(this);
  }
};