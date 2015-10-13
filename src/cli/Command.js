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

  process.exit(64); // eslint-disable-line no-process-exit
};

Command.prototype.defaultHelp = function () {
  console.log(
`
${help(this, '  ')}

`
  );

  process.exit(64); // eslint-disable-line no-process-exit
};

Command.prototype.unknownArgv = function (argv) {
  if (argv) this.__unknownArgv = argv;
  return this.__unknownArgv ? this.__unknownArgv.slice(0) : [];
};

/**
 * setup the command to accept arbitrary configuration via the cli
 * @return {[type]} [description]
 */
Command.prototype.collectUnknownOptions = function () {
  let title = `Extra ${this._name} options`;

  this.allowUnknownOption();
  this.getUnknownOptions = function () {
    let opts = {};
    let unknowns = this.unknownArgv();

    while (unknowns.length) {
      let opt = unknowns.shift().split('=');
      if (opt[0].slice(0, 2) !== '--') {
        this.error(`${title} "${opt[0]}" must start with "--"`);
      }

      if (opt.length === 1) {
        if (!unknowns.length || unknowns[0][0] === '-') {
          this.error(`${title} "${opt[0]}" must have a value`);
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

  return this;
};

Command.prototype.parseOptions = _.wrap(Command.prototype.parseOptions, function (parse, argv) {
  let opts = parse.call(this, argv);
  this.unknownArgv(opts.unknown);
  return opts;
});

Command.prototype.action = _.wrap(Command.prototype.action, function (action, fn) {
  return action.call(this, function (...args) {
    var ret = fn.apply(this, args);
    if (ret && typeof ret.then === 'function') {
      ret.then(null, function (e) {
        console.log('FATAL CLI ERROR', e.stack);
        process.exit(1);
      });
    }
  });
});

module.exports = Command;
