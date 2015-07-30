'use strict';

let _ = require('lodash');

let utils = require('requirefrom')('src/utils');
let pkg = utils('packageJson');
let Command = require('./Command');

let argv = process.env.kbnWorkerArgv ? JSON.parse(process.env.kbnWorkerArgv) : process.argv.slice();
let program = new Command('bin/kibana');

program
.version(pkg.version)
.description(
  'Kibana is an open source (Apache Licensed), browser ' +
  'based analytics and search dashboard for Elasticsearch.'
);

// attach commands
require('./serve/serve')(program);
require('./plugin/plugin')(program);

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

// check for no command name
var subCommand = argv[2] && !String(argv[2][0]).match(/^-|^\.|\//);

if (!subCommand) {
  if (_.intersection(argv.slice(2), ['-h', '--help']).length) {
    program.defaultHelp();
  } else {
    argv.splice(2, 0, ['serve']);
  }
}

program.parse(argv);
