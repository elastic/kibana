'use strict';

let _ = require('lodash');
let Command = require('commander').Command;

let red = require('./color').red;
let yellow = require('./color').yellow;
let help = require('./help');

Command.prototype.error = function (err) {
  if (err && err.message) err = err.message;

  console.log(
`
${red(' ERROR ')} ${err}

${help(this, '  ')}
`
  );
};

Command.prototype.unknownArgv = function (argv) {
  if (argv) this.__unkownArgv = argv;
  return (this.__unkownArgv || []).slice(0);
};

Command.prototype.getUnknownOpts = function () {
  let opts = {};
  let unknowns = this.unknownArgv();

  while (unknowns.length) {
    let opt = unknowns.shift().split('=');
    if (opt[0].slice(0, 2) !== '--') {
      this.error(`Extra option "${opt[0]}" must start with "--"`);
    }

    if (opt.length === 1) {
      if (!unknowns.length || unknowns[0][0] === '-') {
        this.error(`Extra option "${opt[0]}" must have a value`);
      }

      opt.push(unknowns.shift());
    }

    let val = opt[1];
    try { val = JSON.parse(opt[1]); }
    catch (e) { val = opt[1]; }

    _.set(opts, opt[0].slice(2), val);
  }

  return opts;
};

Command.prototype.parseOptions = _.wrap(Command.prototype.parseOptions, function (parse, argv) {
  let opts = parse.call(this, argv);
  this.unknownArgv(opts.unknown);
  return opts;
});

module.exports = Command;
