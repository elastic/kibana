import _ from 'lodash';
import { pkg } from '../utils';
import Command from './command';
import serveCommand from './serve/serve';
import semver from 'semver';

const argv = process.env.kbnWorkerArgv ? JSON.parse(process.env.kbnWorkerArgv) : process.argv.slice();
const program = new Command('bin/kibana');
const currentNodeVersion = semver.valid(
  semver.coerce(
    _.get(process, 'version', null)
  )
);
const requiredNodeVersion = _.get(pkg, 'engines.node', null);

// Validates at Kibana's start if the current node version satisfies
// the one defined into the package.json file.
// If a valid node version is being used the process will continue,
// otherwise it will exit.
//
// Note: It supports comparision with a node version range.
//
if (!!currentNodeVersion
  && !!requiredNodeVersion
  && !semver.satisfies(currentNodeVersion, requiredNodeVersion)) {

  console.error(
    `Kibana does not support the current Node.js version ' + ${currentNodeVersion} 
    + '. Please use Node.js ${requiredNodeVersion}.`
  );
  process.exit(1);
}

program
  .version(pkg.version)
  .description(
    'Kibana is an open source (Apache Licensed), browser ' +
    'based analytics and search dashboard for Elasticsearch.'
  );

// attach commands
serveCommand(program);

program
  .command('help <command>')
  .description('Get the help for a specific command')
  .action(function (cmdName) {
    const cmd = _.find(program.commands, { _name: cmdName });
    if (!cmd) return program.error(`unknown command ${cmdName}`);
    cmd.help();
  });

program
  .command('*', null, { noHelp: true })
  .action(function (cmd) {
    program.error(`unknown command ${cmd}`);
  });

// check for no command name
const subCommand = argv[2] && !String(argv[2][0]).match(/^-|^\.|\//);

if (!subCommand) {
  if (_.intersection(argv.slice(2), ['-h', '--help']).length) {
    program.defaultHelp();
  } else {
    argv.splice(2, 0, ['serve']);
  }
}

program.parse(argv);
