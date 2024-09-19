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

exports.description = 'Build and run from source';

exports.help = (defaults = {}) => {
  const { license = 'basic', password = 'changeme', 'base-path': basePath } = defaults;

  return dedent`
    Options:

      --license         Run with a 'oss', 'basic', or 'trial' license [default: ${license}]
      --source-path     Path to ES source [default: ${defaults['source-path']}]
      --base-path       Path containing cache/installations [default: ${basePath}]
      --install-path    Installation path, defaults to 'source' within base-path
      --data-archive    Path to zip or tarball containing an ES data directory to seed the cluster with.
      --password        Sets password for elastic user [default: ${password}]
      --password.[user] Sets password for native realm user [default: ${password}]
      --ssl             Sets up SSL on Elasticsearch
      -E                Additional key=value settings to pass to Elasticsearch

    Example:

      es snapshot --source-path=../elasticsearch -E cluster.name=test -E path.data=/tmp/es-data
  `;
};

exports.run = async (defaults = {}) => {
  const argv = process.argv.slice(2);
  const options = getopts(argv, {
    alias: {
      basePath: 'base-path',
      installPath: 'install-path',
      sourcePath: 'source-path',
      dataArchive: 'data-archive',
      esArgs: 'E',
    },

    default: defaults,
  });

  const cluster = new Cluster({ ssl: options.ssl });
  const { installPath } = await cluster.installSource(options);

  if (options.dataArchive) {
    await cluster.extractDataDirectory(installPath, options.dataArchive);
  }

  await cluster.run(installPath, options);
};
