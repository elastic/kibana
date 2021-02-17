/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Url from 'url';

import { RunWithCommands, createFlagError, Flags, KbnClient } from '@kbn/dev-utils';

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

export function runSavedObjectsCli() {
  new RunWithCommands({
    description: 'Import/export saved objects from archives, for testing',
    globalFlags: {
      string: ['config'],
      help: `
        --config           optional path to an FTR config file that will be parsed and used for defaults
        --kibana-url       set the url that kibana can be reached at, uses the URL from --config by default, or localhost:5601
        --dir              directory that contains exports to be imported, or where exports will be saved, uses the path from --config
                             by default or failes when not specified.
      `,
    },
    async extendContext({ log, flags }) {
      let config;
      if (!flags.config) {
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

      let importExportDir;
      if (flags.dir) {
        if (typeof flags.dir !== 'string') {
          throw createFlagError('expected --dir to be a string');
        }

        importExportDir = flags.dir;
      } else if (config) {
        importExportDir = config.get('savedObjects.directory');
      }

      if (!importExportDir) {
        throw createFlagError(
          '--config does not include a savedObjects.directory, specify it or include --dir flag'
        );
      }

      return {
        kbnClient: new KbnClient({
          log,
          url: kibanaUrl ?? 'http://localhost:5601',
          importExportDir,
        }),
      };
    },
  })
    .command({
      name: 'import',
      usage: 'import <name>',
      description: 'import a saved export to Kibana',
      async run({ kbnClient, flags }) {
        await kbnClient.importExport.import(getSinglePositionalArg(flags));
      },
    })
    .command({
      name: 'export',
      usage: 'export <name>',
      description: 'export saved objects from Kibana to a file',
      async run({ kbnClient, flags }) {
        await kbnClient.importExport.export(getSinglePositionalArg(flags));
      },
    })
    .execute();
}
