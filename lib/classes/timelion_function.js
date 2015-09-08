var _ = require('lodash');
module.exports = class TimelionFunction {
  constructor(name, config) {
    this.name = name;
    this.args = config.args || [];
    this.argsByName = _.indexBy(this.args, 'name');
    this.help = config.help || '';
    this.aliases = config.aliases || [];
    this.fn = config.fn || function (input) { return input; };
  }
};