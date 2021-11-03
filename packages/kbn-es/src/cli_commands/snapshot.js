/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const dedent = require('dedent');
const getopts = require('getopts');
import { ToolingLog, getTimeReporter } from '@kbn/dev-utils';
const { Cluster } = require('../cluster');

exports.description = 'Downloads and run from a nightly snapshot';

exports.help = (defaults = {}) => {
  const { license = 'basic', password = 'changeme', 'base-path': basePath } = defaults;

  return dedent`
    Options:

      --license         Run with a 'oss', 'basic', or 'trial' license [default: ${license}]
      --version         Version of ES to download [default: ${defaults.version}]
      --base-path       Path containing cache/installations [default: ${basePath}]
      --install-path    Installation path, defaults to 'source' within base-path
      --data-archive    Path to zip or tarball containing an ES data directory to seed the cluster with.
      --password        Sets password for elastic user [default: ${password}]
      --password.[user] Sets password for native realm user [default: ${password}]
      -E                Additional key=value settings to pass to Elasticsearch
      --download-only   Download the snapshot but don't actually start it
      --ssl             Sets up SSL on Elasticsearch

    Example:

      es snapshot --version 5.6.8 -E cluster.name=test -E path.data=/tmp/es-data
  `;
};

exports.run = async (defaults = {}) => {
  const runStartTime = Date.now();
  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });
  const reportTime = getTimeReporter(log, 'scripts/es snapshot');

  const argv = process.argv.slice(2);
  const options = getopts(argv, {
    alias: {
      basePath: 'base-path',
      installPath: 'install-path',
      dataArchive: 'data-archive',
      esArgs: 'E',
    },

    string: ['version'],

    boolean: ['download-only'],

    default: defaults,
  });

  const cluster = new Cluster({ ssl: options.ssl });
  if (options['download-only']) {
    await cluster.downloadSnapshot(options);
  } else {
    const installStartTime = Date.now();
    const { installPath } = await cluster.installSnapshot(options);

    if (options.dataArchive) {
      await cluster.extractDataDirectory(installPath, options.dataArchive);
    }

    reportTime(installStartTime, 'installed', {
      success: true,
      ...options,
    });

    await cluster.run(installPath, {
      reportTime,
      startTime: runStartTime,
      ...options,
    });
  }
};
