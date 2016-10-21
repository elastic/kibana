
module.exports = function enableCollectingUnknownOptions(command) {
  var origParse = command.parseOptions;
  command.allowUnknownOption();
  command.parseOptions = function (argv) {
    let opts = origParse.call(this, argv);
    this.unkownOptions = opts.unknown;
    return opts;
  };
};
