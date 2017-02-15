/*************************************************************
 *
 *  Run `./bin/es_archiver -- --help` for usage information
 *
 *************************************************************/

import { resolve } from 'path';
import { readFileSync } from 'fs';
import { format as formatUrl } from 'url';

import { Command } from 'commander';
import elasticsearch from 'elasticsearch';

import pkg from '../../package.json';
import { EsArchiver } from './es_archiver';
import { createLog } from './lib';

const cmd = new Command('./bin/es_archiver --');

cmd
  .description(`CLI to manage archiving/restoring data in elasticsearch`)
  .option('--es-url [url]', 'url for elasticsearch')
  .option(`--dir [path]`, 'where archives are stored')
  .option('--no-kibana-version', 'Disable auto matching of kibana docs to current kibana version')
  .option('--verbose', 'turn on verbose logging')
  .option('--config [path]', 'path to a functional test config file to use for default values')
  .on('--help', () => {
    console.log(readFileSync(resolve(__dirname, './cli_help.txt'), 'utf8'));
  });

cmd.command('save <name> <indices...>')
  .action((name, indices) => execute('save', { name, indices }));

cmd.command('load <name>')
  .action(name => execute('load', { name }));

cmd.command('rebuild-all')
  .action(name => execute('rebuildAll'));

cmd.parse(process.argv);

const missingCommand = cmd.args.every(a => !(a instanceof Command));
if (missingCommand) {
  execute();
}

async function execute(operation, options) {
  try {
    const log = createLog(cmd.verbose ? 3 : 2, process.stdout);

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
        dir: resolve(cmd.dir),
        kibanaVersion: cmd.kibanaVersion ? pkg.version : undefined,
      });
      await esArchiver[operation](options);
    } finally {
      await client.close();
    }
  } catch (err) {
    console.log('FATAL ERROR', err.stack);
  }
}
