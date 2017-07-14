/*************************************************************
 *
 *  Run `node scripts/es_archiver --help` for usage information
 *
 *************************************************************/

import { resolve } from 'path';
import { readFileSync } from 'fs';
import { format as formatUrl } from 'url';

import { Command } from 'commander';
import elasticsearch from 'elasticsearch';

import { EsArchiver } from './es_archiver';
import { createToolingLog } from '../utils';
import { readConfigFile } from '../functional_test_runner';

const cmd = new Command('node scripts/es_archiver');

const resolveConfigPath = v => resolve(process.cwd(), v);
const defaultConfigPath = resolveConfigPath('test/functional/config.js');

cmd
  .description(`CLI to manage archiving/restoring data in elasticsearch`)
  .option('--es-url [url]', 'url for elasticsearch')
  .option(`--dir [path]`, 'where archives are stored')
  .option('--verbose', 'turn on verbose logging')
  .option('--config [path]', 'path to a functional test config file to use for default values', resolveConfigPath, defaultConfigPath)
  .on('--help', () => {
    console.log(readFileSync(resolve(__dirname, './cli_help.txt'), 'utf8'));
  });

cmd.command('save <name> <indices...>')
  .description('archive the <indices ...> into the --dir with <name>')
  .action((name, indices) => execute('save', name, indices));

cmd.command('load <name>')
  .description('load the archive in --dir with <name>')
  .action(name => execute('load', name));

cmd.command('unload <name>')
  .description('remove indices created by the archive in --dir with <name>')
  .action(name => execute('unload', name));

cmd.command('rebuild-all')
  .description('[internal] read and write all archives in --dir to remove any inconsistencies')
  .action(() => execute('rebuildAll'));

cmd.parse(process.argv);

const missingCommand = cmd.args.every(a => !(a instanceof Command));
if (missingCommand) {
  execute();
}

async function execute(operation, ...args) {
  try {
    const log = createToolingLog(cmd.verbose ? 'debug' : 'info');
    log.pipe(process.stdout);

    if (cmd.config) {
      // load default values from the specified config file
      const config = await readConfigFile(log, resolve(cmd.config));
      if (!cmd.esUrl) cmd.esUrl = formatUrl(config.get('servers.elasticsearch'));
      if (!cmd.dir) cmd.dir = config.get('esArchiver.directory');
    }

    // log and count all validation errors
    let errorCount = 0;
    const error = (msg) => {
      errorCount++;
      log.error(msg);
    };

    if (!operation) error('Missing or invalid command');
    if (!cmd.esUrl) {
      error('You must specify either --es-url or --config flags');
    }
    if (!cmd.dir) {
      error('You must specify either --dir or --config flags');
    }

    // if there was a validation error display the help
    if (errorCount) {
      cmd.help();
      return;
    }

    // run!

    const client = new elasticsearch.Client({
      host: cmd.esUrl,
      log: cmd.verbose ? 'trace' : []
    });

    try {
      const esArchiver = new EsArchiver({
        log,
        client,
        dataDir: resolve(cmd.dir),
      });
      await esArchiver[operation](...args);
    } finally {
      await client.close();
    }
  } catch (err) {
    console.log('FATAL ERROR', err.stack);
  }
}
