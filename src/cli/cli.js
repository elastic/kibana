'use strict';

let _ = require('lodash');
let pkg = require('../utils/closestPackageJson').getSync();
let Command = require('./Command');

let argv = require('cluster').isWorker ? JSON.parse(process.env.kbnWorkerArgv) : process.argv.slice();
let program = new Command('bin/kibana');

program
.version(pkg.version)
.description(
  'Kibana is an open source (Apache Licensed), browser based analytics ' +
  'and search dashboard for Elasticsearch.'
);

// attach commands
var serve = require('./commands/serve')(program);

// check for no command name
if (!argv[2] || argv[2][0] === '-') {
  argv.splice(2, 0, ['serve']);
}

program
.command('help <command>')
.description('Get the help for a specific command')
.action(function (cmdName) {
  var cmd = _.find(program.commands, { _name: cmdName });
  if (!cmd) return this.error(`unknown command ${cmd}`);
  cmd.help();
});

program
.command('*', null, { noHelp: true })
.action(function (cmd, options) {
  program.error(`unknown command ${cmd}`);
});

program.parse(argv);
