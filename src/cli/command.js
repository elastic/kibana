/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set } from '@kbn/safer-lodash-set';
import _ from 'lodash';
import Chalk from 'chalk';

import help from './help';
import { Command } from 'commander';

Command.prototype.error = function (err) {
  if (err && err.message) err = err.message;

  console.log(
    `
${Chalk.white.bgRed(' ERROR ')} ${err}

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
  const title = `Extra ${this._name} options`;

  this.allowUnknownOption();
  this.getUnknownOptions = function () {
    const opts = {};

    /**
     * Commander.js already presents the unknown args split by "=",
     * and shorthand switches already split, like -asd => -a, -s, -d
     */
    const unknowns = this.unknownArgv();

    const singleFlagArgs = unknowns.filter((flag) => {
      return flag.match(/^-[a-zA-Z0-9]$/);
    });

    if (singleFlagArgs.length) {
      this.error(
        `${title} shouldn't have unknown shorthand flag arguments (${singleFlagArgs}). Possibly an argumentation error?`
      );
    }

    while (unknowns.length) {
      const optName = unknowns.shift();

      if (optName.slice(0, 2) !== '--') {
        this.error(`${title} "${optName}" must start with "--"`);
      }

      if (unknowns.length === 0) {
        this.error(`${title} "${optName}" must have a value`);
      }

      const optValue = unknowns.shift();

      let val = optValue;
      try {
        val = JSON.parse(optValue);
      } catch {
        val = optValue;
      }

      set(opts, optName.slice(2), val);
    }

    return opts;
  };

  return this;
};

Command.prototype.parseOptions = _.wrap(Command.prototype.parseOptions, function (parse, argv) {
  const opts = parse.call(this, argv);
  this.unknownArgv(opts.unknown);
  return opts;
});

Command.prototype.action = _.wrap(Command.prototype.action, function (action, fn) {
  return action.call(this, function (...args) {
    const ret = fn.apply(this, args);
    if (ret && typeof ret.then === 'function') {
      ret.then(null, function (e) {
        console.log('FATAL CLI ERROR', e.stack);
        process.exit(1);
      });
    }
  });
});

export default Command;
