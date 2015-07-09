module.exports = function (program) {
  program.option('-e, --elasticsearch <uri>', 'Elasticsearch instance');
  program.option('-c, --config <path>', 'Path to the config file');
  program.option('-p, --port <port>', 'The port to bind to', parseInt);
  program.option('-q, --quiet', 'Turns off logging');
  program.option('-H, --host <host>', 'The host to bind to');
  program.option('-l, --log-file <path>', 'The file to log to');
  program.option('--plugins <path>', 'Path to scan for plugins');
};