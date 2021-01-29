/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/** ***********************************************************
 *
 *  Run `node scripts/es_archiver --help` for usage information
 *
 *************************************************************/

import Path from 'path';
import Url from 'url';
import readline from 'readline';
import Fs from 'fs';

import { RunWithCommands, createFlagError, KbnClient, CA_CERT_PATH } from '@kbn/dev-utils';
import { readConfigFile } from '@kbn/test';
import legacyElasticsearch from 'elasticsearch';

import { EsArchiver } from './es_archiver';

const resolveConfigPath = (v: string) => Path.resolve(process.cwd(), v);
const defaultConfigPath = resolveConfigPath('test/functional/config.js');

export function runCli() {
  new RunWithCommands({
    description: 'CLI to manage archiving/restoring data in elasticsearch',
    globalFlags: {
      string: ['es-url', 'kibana-url', 'dir', 'config', 'es-ca', 'kibana-ca'],
      help: `
        --config           path to an FTR config file that sets --es-url, --kibana-url, and --dir
                             default: ${defaultConfigPath}
        --es-url           url for Elasticsearch, prefer the --config flag
        --kibana-url       url for Kibana, prefer the --config flag
        --dir              where arechives are stored, prefer the --config flag
        --kibana-ca        if Kibana url points to https://localhost we default to the CA from @kbn/dev-utils, customize the CA with this flag
        --es-ca            if Elasticsearch url points to https://localhost we default to the CA from @kbn/dev-utils, customize the CA with this flag
      `,
    },
    async extendContext({ log, flags, addCleanupTask }) {
      const configPath = flags.config || defaultConfigPath;
      if (typeof configPath !== 'string') {
        throw createFlagError('--config must be a string');
      }
      const config = await readConfigFile(log, Path.resolve(configPath));

      let esUrl = flags['es-url'];
      if (esUrl && typeof esUrl !== 'string') {
        throw createFlagError('--es-url must be a string');
      }
      if (!esUrl && config) {
        esUrl = Url.format(config.get('servers.elasticsearch'));
      }
      if (!esUrl) {
        throw createFlagError('--es-url or --config must be defined');
      }

      let kibanaUrl = flags['kibana-url'];
      if (kibanaUrl && typeof kibanaUrl !== 'string') {
        throw createFlagError('--kibana-url must be a string');
      }
      if (!kibanaUrl && config) {
        kibanaUrl = Url.format(config.get('servers.kibana'));
      }
      if (!kibanaUrl) {
        throw createFlagError('--kibana-url or --config must be defined');
      }

      const kibanaCaPath = flags['kibana-ca'];
      if (kibanaCaPath && typeof kibanaCaPath !== 'string') {
        throw createFlagError('--kibana-ca must be a string');
      }

      let kibanaCa;
      if (config.get('servers.kibana.certificateAuthorities') && !kibanaCaPath) {
        kibanaCa = config.get('servers.kibana.certificateAuthorities');
      } else if (kibanaCaPath) {
        kibanaCa = Fs.readFileSync(kibanaCaPath);
      } else {
        const { protocol, hostname } = Url.parse(kibanaUrl);
        if (protocol === 'https:' && hostname === 'localhost') {
          kibanaCa = Fs.readFileSync(CA_CERT_PATH);
        }
      }

      const esCaPath = flags['es-ca'];
      if (esCaPath && typeof esCaPath !== 'string') {
        throw createFlagError('--es-ca must be a string');
      }

      let esCa;
      if (config.get('servers.elasticsearch.certificateAuthorities') && !esCaPath) {
        esCa = config.get('servers.elasticsearch.certificateAuthorities');
      } else if (esCaPath) {
        esCa = Fs.readFileSync(esCaPath);
      } else {
        const { protocol, hostname } = Url.parse(kibanaUrl);
        if (protocol === 'https:' && hostname === 'localhost') {
          esCa = Fs.readFileSync(CA_CERT_PATH);
        }
      }

      let dir = flags.dir;
      if (dir && typeof dir !== 'string') {
        throw createFlagError('--dir must be a string');
      }
      if (!dir && config) {
        dir = Path.resolve(config.get('esArchiver.directory'));
      }
      if (!dir) {
        throw createFlagError('--dir or --config must be defined');
      }

      const client = new legacyElasticsearch.Client({
        host: esUrl,
        ssl: esCa ? { ca: esCa } : undefined,
        log: flags.verbose ? 'trace' : [],
      });
      addCleanupTask(() => client.close());

      const kbnClient = new KbnClient({
        log,
        url: kibanaUrl,
        certificateAuthorities: kibanaCa ? [kibanaCa] : undefined,
      });

      const esArchiver = new EsArchiver({
        log,
        client,
        dataDir: dir,
        kbnClient,
      });

      return {
        esArchiver,
      };
    },
  })
    .command({
      name: 'save',
      usage: 'save [name] [...indices]',
      description: `
        archive the [indices ...] into the --dir with [name]

        Example:
          Save all [logstash-*] indices from http://localhost:9200 to [snapshots/my_test_data] directory

          WARNING: If the [my_test_data] snapshot exists it will be deleted!

          $ node scripts/es_archiver save my_test_data logstash-* --dir snapshots
      `,
      flags: {
        boolean: ['raw'],
        string: ['query'],
        help: `
          --raw              don't gzip the archives
          --query            query object to limit the documents being archived, needs to be properly escaped JSON
        `,
      },
      async run({ flags, esArchiver }) {
        const [name, ...indices] = flags._;
        if (!name) {
          throw createFlagError('missing [name] argument');
        }
        if (!indices.length) {
          throw createFlagError('missing [...indices] arguments');
        }

        const raw = flags.raw;
        if (typeof raw !== 'boolean') {
          throw createFlagError('--raw does not take a value');
        }

        const query = flags.query;
        let parsedQuery;
        if (typeof query === 'string' && query.length > 0) {
          try {
            parsedQuery = JSON.parse(query);
          } catch (err) {
            throw createFlagError('--query should be valid JSON');
          }
        }

        await esArchiver.save(name, indices, { raw, query: parsedQuery });
      },
    })
    .command({
      name: 'load',
      usage: 'load [name]',
      description: `
        load the archive in --dir with [name]

        Example:
          Load the [my_test_data] snapshot from the archive directory and elasticsearch instance defined
          in the [test/functional/config.js] config file

          WARNING: If the indices exist already they will be deleted!

          $ node scripts/es_archiver load my_test_data --config test/functional/config.js
      `,
      flags: {
        boolean: ['use-create'],
        help: `
          --use-create       use create instead of index for loading documents
        `,
      },
      async run({ flags, esArchiver }) {
        const [name] = flags._;
        if (!name) {
          throw createFlagError('missing [name] argument');
        }
        if (flags._.length > 1) {
          throw createFlagError(`unknown extra arguments: [${flags._.slice(1).join(', ')}]`);
        }

        const useCreate = flags['use-create'];
        if (typeof useCreate !== 'boolean') {
          throw createFlagError('--use-create does not take a value');
        }

        await esArchiver.load(name, { useCreate });
      },
    })
    .command({
      name: 'unload',
      usage: 'unload [name]',
      description: 'remove indices created by the archive in --dir with [name]',
      async run({ flags, esArchiver }) {
        const [name] = flags._;
        if (!name) {
          throw createFlagError('missing [name] argument');
        }
        if (flags._.length > 1) {
          throw createFlagError(`unknown extra arguments: [${flags._.slice(1).join(', ')}]`);
        }

        await esArchiver.unload(name);
      },
    })
    .command({
      name: 'edit',
      usage: 'edit [prefix]',
      description:
        'extract the archives under the prefix, wait for edits to be completed, and then recompress the archives',
      async run({ flags, esArchiver }) {
        const [prefix] = flags._;
        if (!prefix) {
          throw createFlagError('missing [prefix] argument');
        }
        if (flags._.length > 1) {
          throw createFlagError(`unknown extra arguments: [${flags._.slice(1).join(', ')}]`);
        }

        await esArchiver.edit(prefix, async () => {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          await new Promise<void>((resolveInput) => {
            rl.question(`Press enter when you're done`, () => {
              rl.close();
              resolveInput();
            });
          });
        });
      },
    })
    .command({
      name: 'empty-kibana-index',
      description:
        '[internal] Delete any Kibana indices, and initialize the Kibana index as Kibana would do on startup.',
      async run({ esArchiver }) {
        await esArchiver.emptyKibanaIndex();
      },
    })
    .command({
      name: 'rebuild-all',
      description: '[internal] read and write all archives in --dir to remove any inconsistencies',
      async run({ esArchiver }) {
        await esArchiver.rebuildAll();
      },
    })
    .execute();
}
