import Logger from '../cli_plugin/lib/logger';

export function list(keystore, command, options = {}) {
  const logger = new Logger(options);

  if (!keystore.exists()) {
    return logger.error('ERROR: Kibana keystore not found. Use \'create\' command to create one.');
  }

  const keys = keystore.keys();
  logger.log(keys.join('\n'));
}

export function listCli(program, keystore) {
  program
    .command('list')
    .description('List entries in the keystore')
    .option('-s, --silent', 'prevent all logging')
    .action(list.bind(null, keystore));
}
