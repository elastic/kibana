
module.exports = function enableCollectingUnknownOptions(command) {
  const origParse = command.parseOptions;
  command.allowUnknownOption();
  command.parseOptions = function (argv) {
    const opts = origParse.call(this, argv);
    this.unknownOptions = opts.unknown;
    return opts;
  };
};
