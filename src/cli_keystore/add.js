import Logger from '../cli_plugin/lib/logger';
import { confirm, question } from '../server/utils';
import { createPromiseFromStreams, createConcatStream } from '../utils';

/**
 * @param {Keystore} keystore
 * @param {String} key
 * @param {Object|null} options
 * @property {Boolean} options.force - if true, will overwrite without prompting
 * @property {Stream} options.stdinStream - defaults to process.stdin
 * @property {Boolean} options.stdin - if true, uses options.stdin to read value
 */

export async function add(keystore, key, options = {}) {
  const logger = new Logger(options);
  let value;

  if (!keystore.exists()) {
    return logger.error('ERROR: Kibana keystore not found. Use \'create\' command to create one.');
  }

  if (!options.force && keystore.has(key)) {
    if (options.stdin) {
      return logger.log(`Setting ${key} already exists, exiting without modifying keystore.`);
    } else {
      const overwrite = await confirm(`Setting ${key} already exists. Overwrite?`);

      if (!overwrite) {
        return logger.log('Exiting without modifying keystore.');
      }
    }
  }

  if (options.stdin) {
    value = await createPromiseFromStreams([
      options.stdinStream || process.stdin,
      createConcatStream('')
    ]);
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
    .option('-s, --silent', 'prevent all logging')
    .action(add.bind(null, keystore));
}
