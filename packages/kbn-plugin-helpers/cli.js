const program = require('commander');

const pkg = require('./package.json');
const createCommanderAction = require('./lib/commander_action');
const docs = require('./lib/docs');
const enableCollectingUnknownOptions = require('./lib/enable_collecting_unknown_options');

program
  .version(pkg.version);

enableCollectingUnknownOptions(
  program
    .command('start')
    .description('Start kibana and have it include this plugin')
    .on('--help', docs('start'))
    .action(createCommanderAction('start', (command) => ({
      flags: command.unknownOptions
    })))
);

program
  .command('build [files...]')
  .description('Build a distributable archive')
  .on('--help', docs('build'))
  .option('--skip-archive', 'Don\'t create the zip file, leave the build path alone')
  .option('-d, --build-destination <path>', 'Target path for the build output, absolute or relative to the plugin root')
  .option('-b, --build-version <version>', 'Version for the build output')
  .option('-k, --kibana-version <version>', 'Kibana version for the build output')
  .action(createCommanderAction('build', (command, files) => ({
    buildDestination: command.buildDestination,
    buildVersion: command.buildVersion,
    kibanaVersion: command.kibanaVersion,
    skipArchive: Boolean(command.skipArchive),
    files: files,
  })));

program
  .command('test')
  .description('Run the server and browser tests')
  .on('--help', docs('test/all'))
  .action(createCommanderAction('testAll'));

program
  .command('test:browser')
  .description('Run the browser tests in a real web browser')
  .option('--dev', 'Enable dev mode, keeps the test server running')
  .option('-p, --plugins <plugin-ids>', 'Manually specify which plugins\' test bundles to run')
  .on('--help', docs('test/browser'))
  .action(createCommanderAction('testBrowser', (command) => ({
    dev: Boolean(command.dev),
    plugins: command.plugins,
  })));

program
  .command('test:server [files...]')
  .description('Run the server tests using mocha')
  .on('--help', docs('test/server'))
  .action(createCommanderAction('testServer', (command, files) => ({
    files: files
  })));

program
  .command('postinstall')
  .action(createCommanderAction('postinstall'));

program
  .parse(process.argv);
