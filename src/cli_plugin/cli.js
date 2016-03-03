import _ from 'lodash';
import pkg from '../utils/packageJson';
import Command from '../cli/Command';

let argv = process.env.kbnWorkerArgv ? JSON.parse(process.env.kbnWorkerArgv) : process.argv.slice();
let program = new Command('bin/kibana-plugin');

program
.version(pkg.version)
.description(
  'Kibana is an open source (Apache Licensed), browser ' +
  'based analytics and search dashboard for Elasticsearch.'
);

require('./list')(program);
require('./install')(program);
require('./remove')(program);

program
.command('help <command>')
.description('Get the help for a specific command')
.action(function (cmdName) {
  var cmd = _.find(program.commands, { _name: cmdName });
  if (!cmd) return this.error(`unknown command ${cmdName}`);
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
  program.defaultHelp();
}

program.parse(argv);
