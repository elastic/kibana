import _ from 'lodash';
import pkg from '../utils/package_json';
import Command from '../cli/command';
import listCommand from './list';
import installCommand from './install';
import removeCommand from './remove';

let argv = process.env.kbnWorkerArgv ? JSON.parse(process.env.kbnWorkerArgv) : process.argv.slice();
let program = new Command('bin/kibana-plugin');

program
.version(pkg.version)
.description(
  'The Kibana plugin manager enables you to install and remove plugins that ' +
  'provide additional functionality to Kibana'
);

listCommand(program);
installCommand(program);
removeCommand(program);

program
.command('help <command>')
.description('get the help for a specific command')
.action(function (cmdName) {
  let cmd = _.find(program.commands, { _name: cmdName });
  if (!cmd) return program.error(`unknown command ${cmdName}`);
  cmd.help();
});

program
.command('*', null, { noHelp: true })
.action(function (cmd, options) {
  program.error(`unknown command ${cmd}`);
});

// check for no command name
let subCommand = argv[2] && !String(argv[2][0]).match(/^-|^\.|\//);
if (!subCommand) {
  program.defaultHelp();
}

program.parse(argv);
