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
import { KbnClient } from '@kbn/test';

import { readConfigFile } from './functional_test_runner';

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
  if (!flags.type) {
    return undefined;
  }

  if (Array.isArray(flags.type)) {
    return flags.type;
  }

  if (typeof flags.type === 'string') {
    return [flags.type];
  }

  throw createFlagError('--flag must be a string');
}

export function runKbnArchiverCli() {
  new RunWithCommands({
    description: 'Import/export saved objects from archives, for testing',
    globalFlags: {
      string: ['config'],
      help: `
        --config           optional path to an FTR config file that will be parsed and used for defaults
        --kibana-url       set the url that kibana can be reached at, uses the "servers.kibana" setting from --config by default
        --dir              directory that contains exports to be imported, or where exports will be saved, uses the "kbnArchiver.directory"
                             setting from --config by default
      `,
    },
    async extendContext({ log, flags }) {
      let config;
      if (flags.config) {
        if (typeof flags.config !== 'string') {
          throw createFlagError('expected --config to be a string');
        }

        config = await readConfigFile(log, Path.resolve(flags.config));
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

      let importExportDir;
      if (flags.dir) {
        if (typeof flags.dir !== 'string') {
          throw createFlagError('expected --dir to be a string');
        }

        importExportDir = flags.dir;
      } else if (config) {
        importExportDir = config.get('kbnArchiver.directory');
      }

      if (!importExportDir) {
        throw createFlagError(
          '--config does not include a kbnArchiver.directory, specify it or include --dir flag'
        );
      }

      return {
        kbnClient: new KbnClient({
          log,
          url: kibanaUrl,
          importExportDir,
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
                               be specified multiple times and defaults to 'index-pattern', 'search',
                               'visualization', and 'dashboard'.

        `,
      },
      async run({ kbnClient, flags }) {
        await kbnClient.importExport.save(getSinglePositionalArg(flags), {
          savedObjectTypes: parseTypesFlag(flags),
        });
      },
    })
    .command({
      name: 'load',
      usage: 'load <name>',
      description: 'import a saved export to Kibana',
      async run({ kbnClient, flags }) {
        await kbnClient.importExport.load(getSinglePositionalArg(flags));
      },
    })
    .command({
      name: 'unload',
      usage: 'unload <name>',
      description: 'delete the saved objects saved in the archive from the Kibana index',
      async run({ kbnClient, flags }) {
        await kbnClient.importExport.unload(getSinglePositionalArg(flags));
      },
    })
    .execute();
}
