module.exports = class TimelionFunction {
  constructor(name, config) {
    this.name = name;
    this.args = config.args || [];
    this.description = config.description || '';
    this.aliases = config.aliases || [];
    this.fn = config.fn || function (input) { return input; };
  }
};