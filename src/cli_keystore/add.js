import Logger from '../cli_plugin/lib/logger';
import { stdin, confirm, question } from '../utils';

export async function add(keystore, key, options = {}) {
  const logger = new Logger(options);
  let value;

  if (!keystore.exists()) {
    return logger.error('ERROR: Kibana keystore not found. Use \'create\' command to create one.');
  }

  if (!options.force && keystore.has(key)) {
    const overwrite = await confirm(`Setting ${key} already exists. Overwrite?`);

    if (!overwrite) {
      return logger.log('Exiting without modifying keystore.');
    }
  }

  if (options.stdin) {
    value = await stdin();
  } else {
    value = await question(`Enter value for ${key}`, { mask: '*' });
  }

  keystore.add(key, value.trim());
  keystore.save();
}

export function addCli(program, keystore) {
  program
    .command('add <key>')
    .description('Add a string setting to the keystore')
    .option('-f, --force', 'overwrite existing setting without prompting')
    .option('-x, --stdin', 'read setting value from stdin')
    .option('-v, --verbose', 'turns on verbose logging')
    .option('-s, --silent', 'prevent all logging')
    .action(add.bind(null, keystore));
}
