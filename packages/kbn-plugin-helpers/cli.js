var program = require('commander');

var pkg = require('./package.json');
var run = require('./lib/run');
var docs = require('./lib/docs');
var enableCollectingUnknownOptions = require('./lib/enable_collecting_unknown_options');

function taskRunner(fn) {
  return function actionWrapper() {
    var args = [].slice.apply(arguments);
    var command = args.pop();
    fn.apply(null, [command].concat(args));
  };
}

program
  .version(pkg.version);

enableCollectingUnknownOptions(
  program
    .command('start')
    .description('Start kibana and have it include this plugin')
    .on('--help', docs('start'))
    .action(taskRunner(function (command) {
      run('start', {
        flags: command.unknownOptions
      });
    }))
);

program
  .command('build [files...]')
  .description('Build a distributable archive')
  .on('--help', docs('build'))
  .option('--skip-archive', 'Don\'t create the zip file, leave the build path alone')
  .option('-d, --build-destination <path>', 'Target path for the build output, absolute or relative to the plugin root')
  .option('-b, --build-version <version>', 'Version for the build output')
  .option('-k, --kibana-version <version>', 'Kibana version for the build output')
  .action(taskRunner(function (command, files) {
    run('build', {
      buildDestination: command.buildDestination,
      buildVersion: command.buildVersion,
      kibanaVersion: command.kibanaVersion,
      skipArchive: Boolean(command.skipArchive),
      files: files,
    });
  }));

program
  .command('test')
  .description('Run the server and browser tests')
  .on('--help', docs('test/all'))
  .action(taskRunner(function (command, files) {
    run('testAll');
  }));

program
  .command('test:browser')
  .description('Run the browser tests in a real web browser')
  .option('--dev', 'Enable dev mode, keeps the test server running')
  .option('-p, --plugins <plugin-ids>', 'Manually specify which plugins\' test bundles to run')
  .on('--help', docs('test/browser'))
  .action(taskRunner(function (command) {
    run('testBrowser', {
      dev: Boolean(command.dev),
      plugins: command.plugins,
    });
  }));

program
  .command('test:server [files...]')
  .description('Run the server tests using mocha')
  .on('--help', docs('test/server'))
  .action(taskRunner(function (command, files) {
    run('testServer', {
      files: files
    });
  }));

program
  .parse(process.argv);
