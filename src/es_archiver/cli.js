/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*************************************************************
 *
 *  Run `node scripts/es_archiver --help` for usage information
 *
 *************************************************************/

import { resolve } from 'path';
import { readFileSync } from 'fs';
import { format as formatUrl } from 'url';
import readline from 'readline';

import { Command } from 'commander';
import * as legacyElasticsearch from 'elasticsearch';

import { EsArchiver } from './es_archiver';
import { ToolingLog } from '@kbn/dev-utils';
import { readConfigFile } from '@kbn/test';

const cmd = new Command('node scripts/es_archiver');

const resolveConfigPath = v => resolve(process.cwd(), v);
const defaultConfigPath = resolveConfigPath('test/functional/config.js');

cmd
  .description(`CLI to manage archiving/restoring data in elasticsearch`)
  .option('--es-url [url]', 'url for elasticsearch')
  .option(
    '--kibana-url [url]',
    'url for kibana (only necessary if using "load" or "unload" methods)'
  )
  .option(`--dir [path]`, 'where archives are stored')
  .option('--verbose', 'turn on verbose logging')
  .option(
    '--config [path]',
    'path to a functional test config file to use for default values',
    resolveConfigPath,
    defaultConfigPath
  )
  .on('--help', () => {
    console.log(readFileSync(resolve(__dirname, './cli_help.txt'), 'utf8'));
  });

cmd
  .option('--raw', `don't gzip the archive`)
  .command('save <name> <indices...>')
  .description('archive the <indices ...> into the --dir with <name>')
  .action((name, indices) => execute((archiver, { raw }) => archiver.save(name, indices, { raw })));

cmd
  .command('load <name>')
  .description('load the archive in --dir with <name>')
  .action(name => execute(archiver => archiver.load(name)));

cmd
  .command('unload <name>')
  .description('remove indices created by the archive in --dir with <name>')
  .action(name => execute(archiver => archiver.unload(name)));

cmd
  .command('empty-kibana-index')
  .description(
    '[internal] Delete any Kibana indices, and initialize the Kibana index as Kibana would do on startup.'
  )
  .action(() => execute(archiver => archiver.emptyKibanaIndex()));

cmd
  .command('edit [prefix]')
  .description(
    'extract the archives under the prefix, wait for edits to be completed, and then recompress the archives'
  )
  .action(prefix =>
    execute(archiver =>
      archiver.edit(prefix, async () => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        await new Promise(resolve => {
          rl.question(`Press enter when you're done`, () => {
            rl.close();
            resolve();
          });
        });
      })
    )
  );

cmd
  .command('rebuild-all')
  .description('[internal] read and write all archives in --dir to remove any inconsistencies')
  .action(() => execute(archiver => archiver.rebuildAll()));

cmd.parse(process.argv);

const missingCommand = cmd.args.every(a => !(a instanceof Command));
if (missingCommand) {
  execute();
}

async function execute(fn) {
  try {
    const log = new ToolingLog({
      level: cmd.verbose ? 'debug' : 'info',
      writeTo: process.stdout,
    });

    if (cmd.config) {
      // load default values from the specified config file
      const config = await readConfigFile(log, resolve(cmd.config));
      if (!cmd.esUrl) cmd.esUrl = formatUrl(config.get('servers.elasticsearch'));
      if (!cmd.kibanaUrl) cmd.kibanaUrl = formatUrl(config.get('servers.kibana'));
      if (!cmd.dir) cmd.dir = config.get('esArchiver.directory');
    }

    // log and count all validation errors
    let errorCount = 0;
    const error = msg => {
      errorCount++;
      log.error(msg);
    };

    if (!fn) {
      error(`Unknown command "${cmd.args[0]}"`);
    }

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
    const client = new legacyElasticsearch.Client({
      host: cmd.esUrl,
      log: cmd.verbose ? 'trace' : [],
    });

    try {
      const esArchiver = new EsArchiver({
        log,
        client,
        dataDir: resolve(cmd.dir),
        kibanaUrl: cmd.kibanaUrl,
      });
      await fn(esArchiver, cmd);
    } finally {
      await client.close();
    }
  } catch (err) {
    console.log('FATAL ERROR', err.stack);
  }
}
