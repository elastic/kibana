/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Url from 'url';

import { RunWithCommands, createFlagError, Flags } from '@kbn/dev-utils';
import { KbnClient } from './kbn_client';

import { readConfigFile, EsVersion } from './functional_test_runner';

function getSinglePositionalArg(flags: Flags) {
  const positional = flags._;
  if (positional.length < 1) {
    throw createFlagError('missing name of export to import');
  }

  if (positional.length > 1) {
    throw createFlagError(`extra positional arguments, expected 1, got [${positional}]`);
  }

  return positional[0];
}

function parseTypesFlag(flags: Flags) {
  if (!flags.type || (typeof flags.type !== 'string' && !Array.isArray(flags.type))) {
    throw createFlagError('--type is a required flag');
  }

  const types = typeof flags.type === 'string' ? [flags.type] : flags.type;
  return types.reduce(
    (acc: string[], type) => [...acc, ...type.split(',').map((t) => t.trim())],
    []
  );
}

export function runKbnArchiverCli() {
  new RunWithCommands({
    description: 'Import/export saved objects from archives, for testing',
    globalFlags: {
      string: ['config', 'space', 'kibana-url'],
      help: `
        --space            space id to operate on, defaults to the default space
        --config           optional path to an FTR config file that will be parsed and used for defaults
        --kibana-url       set the url that kibana can be reached at, uses the "servers.kibana" setting from --config by default
      `,
    },
    async extendContext({ log, flags, statsMeta }) {
      let config;
      if (flags.config) {
        if (typeof flags.config !== 'string') {
          throw createFlagError('expected --config to be a string');
        }

        config = await readConfigFile(log, EsVersion.getDefault(), Path.resolve(flags.config));
        statsMeta.set('ftrConfigPath', flags.config);
      }

      let kibanaUrl;
      if (flags['kibana-url']) {
        if (typeof flags['kibana-url'] !== 'string') {
          throw createFlagError('expected --kibana-url to be a string');
        }

        kibanaUrl = flags['kibana-url'];
      } else if (config) {
        kibanaUrl = Url.format(config.get('servers.kibana'));
      }

      if (!kibanaUrl) {
        throw createFlagError(
          'Either a --config file with `servers.kibana` defined, or a --kibana-url must be passed'
        );
      }

      const space = flags.space;
      if (!(space === undefined || typeof space === 'string')) {
        throw createFlagError('--space must be a string');
      }

      statsMeta.set('kbnArchiverArg', getSinglePositionalArg(flags));

      return {
        space,
        kbnClient: new KbnClient({
          log,
          url: kibanaUrl,
          importExportBaseDir: process.cwd(),
        }),
      };
    },
  })
    .command({
      name: 'save',
      usage: 'save <name>',
      description: 'export saved objects from Kibana to a file',
      flags: {
        string: ['type'],
        help: `
          --type             saved object type that should be fetched and stored in the archive, can
                               be specified multiple times or be a comma-separated list.
        `,
      },
      async run({ kbnClient, flags, space }) {
        await kbnClient.importExport.save(getSinglePositionalArg(flags), {
          types: parseTypesFlag(flags),
          space,
        });
      },
    })
    .command({
      name: 'load',
      usage: 'load <name>',
      description: 'import a saved export to Kibana',
      async run({ kbnClient, flags, space }) {
        await kbnClient.importExport.load(getSinglePositionalArg(flags), { space });
      },
    })
    .command({
      name: 'unload',
      usage: 'unload <name>',
      description: 'delete the saved objects saved in the archive from the Kibana index',
      async run({ kbnClient, flags, space }) {
        await kbnClient.importExport.unload(getSinglePositionalArg(flags), { space });
      },
    })
    .execute();
}
