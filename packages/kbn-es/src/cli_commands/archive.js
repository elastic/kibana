/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const dedent = require('dedent');
const getopts = require('getopts');
const { Cluster } = require('../cluster');
const { createCliError } = require('../errors');
const { parseTimeoutToMs } = require('../utils');

exports.description = 'Install and run from an Elasticsearch tar';

exports.usage = 'es archive <path> [<args>]';

exports.help = (defaults = {}) => {
  const { password = 'changeme', 'base-path': basePath } = defaults;

  return dedent`
    Options:

      --base-path       Path containing cache/installations [default: ${basePath}]
      --install-path    Installation path, defaults to 'source' within base-path
      --password        Sets password for elastic user [default: ${password}]
      --password.[user] Sets password for native realm user [default: ${password}]
      --ssl             Sets up SSL on Elasticsearch
      -E                Additional key=value settings to pass to Elasticsearch
      --skip-ready-check  Disable the ready check,
      --ready-timeout   Customize the ready check timeout, in seconds or "Xm" format, defaults to 1m

    Example:

      es archive ../elasticsearch.tar.gz -E cluster.name=test -E path.data=/tmp/es-data
  `;
};

exports.run = async (defaults = {}) => {
  const argv = process.argv.slice(2);
  const options = getopts(argv, {
    alias: {
      basePath: 'base-path',
      installPath: 'install-path',
      esArgs: 'E',
      skipReadyCheck: 'skip-ready-check',
      readyTimeout: 'ready-timeout',
    },

    string: ['ready-timeout'],
    boolean: ['skip-ready-check'],

    default: defaults,
  });

  const cluster = new Cluster({ ssl: options.ssl });
  const [, path] = options._;

  if (!path || !path.endsWith('tar.gz')) {
    throw createCliError('you must provide a path to an ES tar file');
  }

  const { installPath } = await cluster.installArchive(path, options);
  await cluster.run(installPath, {
    ...options,
    readyTimeout: parseTimeoutToMs(options.readyTimeout),
  });
};
