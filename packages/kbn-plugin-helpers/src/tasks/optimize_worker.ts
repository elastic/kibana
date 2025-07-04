/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import webpack from 'webpack';
import { parseBundles, BundleRemotes, WorkerConfig } from '@kbn/optimizer/src/common';
import { getWebpackConfig } from '@kbn/optimizer/src/worker/webpack.config';

const send = process.send;
if (!send) {
  throw new Error('must be run as a node.js fork');
}

process.on('message', (msg: any) => {
  if (typeof msg !== 'object' || msg === null) {
    throw new Error('expected message to be an object');
  }

  const workerConfig: WorkerConfig = msg.workerConfig;
  const [bundle] = parseBundles(msg.bundles);
  const remotes = BundleRemotes.parseSpec(msg.bundleRemotes);
  const webpackConfig = getWebpackConfig(bundle, remotes, workerConfig);
  const compiler = webpack(webpackConfig);

  compiler.watch(
    {
      // Example
      aggregateTimeout: 300,
      poll: undefined,
    },
    (error, stats) => {
      if (error) {
        send.call(process, {
          success: false,
          error: error.message,
        });
        return;
      }

      if (stats?.hasErrors()) {
        send.call(process, {
          success: false,
          error: `Failed to compile with webpack:\n${stats.toString()}`,
        });
        return;
      }

      send.call(process, {
        success: true,
        warnings: stats?.hasWarnings() ? stats.toString() : '',
      });
    }
  );
});
