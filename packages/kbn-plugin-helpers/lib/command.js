#!/usr/bin/env node

module.exports = function (name, mod) {
  var pkg = require('../package.json');
  var program = require('commander');
  var docs = require('../docs');
  var idPlugin = require('./id_plugin');
  var task = require('../tasks/' + name);

  program
  .version(pkg.version)
  .on('--help', docs(name));

  mod(program);

  program.parse(process.argv);

  task(idPlugin());
};
