/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';
import getopts from 'getopts';
import { ToolingLog } from '@kbn/tooling-log';
import { getTimeReporter } from '@kbn/ci-stats-reporter';

import { Cluster } from '../cluster';
import { parseTimeoutToMs } from '../utils';
import { createCliError } from '../errors';
import { EIS_ES_ARG, resolveCcmApiKey, setCcmApiKey } from '../eis/eis_setup';
import type { Command } from './types';

export const snapshot: Command = {
  description: 'Downloads and run from a nightly snapshot',
  help: (defaults = {}) => {
    const { license = 'basic', password = 'changeme', 'base-path': basePath } = defaults;

    return dedent`
    Options:

      --license         Run with a 'basic' or 'trial' license [default: ${license}]
      --version         Version of ES to download [default: ${defaults.version}]
      --base-path       Path containing cache/installations [default: ${basePath}]
      --install-path    Installation path, defaults to 'source' within base-path
      --data-archive    Path to zip or tarball containing an ES data directory to seed the cluster with.
      --password        Sets password for elastic user [default: ${password}]
      --password.[user] Sets password for native realm user [default: ${password}]
      -E                Additional key=value settings to pass to Elasticsearch
      --download-only   Download the snapshot but don't actually start it
      --port            The port to bind to on 127.0.0.1 [default: 9200]
      --kill            Kill running ES Docker containers before starting
      --ssl             Sets up SSL on Elasticsearch
      --use-cached      Skips cache verification and use cached ES snapshot.
      --skip-ready-check  Disable the ready check,
      --ready-timeout   Customize the ready check timeout, in seconds or "Xm" format, defaults to 1m
      --es-log-level    Log level for ES stdout output (all, info, warn, error, silent) [default: info]
      --plugins         Comma seperated list of Elasticsearch plugins to install
      --secure-files     Comma seperated list of secure_setting_name=/path pairs
      --eis             Enable EIS mode: sets trial license, EIS inference URL, resolves and sets CCM API key

    Example:

      es snapshot --version 5.6.8 -E cluster.name=test -E path.data=/tmp/es-data
      es snapshot --eis
  `;
  },
  run: async (defaults = {}) => {
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
        useCached: 'use-cached',
        skipReadyCheck: 'skip-ready-check',
        readyTimeout: 'ready-timeout',
        esLogLevel: 'es-log-level',
        secureFiles: 'secure-files',
      },

      string: ['version', 'ready-timeout', 'es-log-level'],
      boolean: ['download-only', 'use-cached', 'skip-ready-check', 'kill', 'eis'],

      default: defaults,
    });

    // --eis implies trial license and the EIS inference URL ES argument.
    if (options.eis) {
      options.license = 'trial';
      const userEsArgs = options.esArgs
        ? Array.isArray(options.esArgs)
          ? options.esArgs
          : [options.esArgs]
        : [];
      options.esArgs = [EIS_ES_ARG, ...userEsArgs];
    }

    const cluster = new Cluster({ ssl: options.ssl });

    if (options.docker) {
      throw createCliError(
        `The --docker flag has been removed from 'es snapshot'. Use 'yarn es docker --snapshot' instead.`
      );
    } else if (options['download-only']) {
      await cluster.downloadSnapshot({
        version: options.version,
        license: options.license,
        basePath: options.basePath,
        log,
        useCached: options.useCached,
      });
    } else {
      const installStartTime = Date.now();
      const { installPath } = await cluster.installSnapshot({
        version: options.version,
        license: options.license,
        basePath: options.basePath,
        log,
        useCached: options.useCached,
        password: options.password,
        esArgs: options.esArgs,
      });

      if (options.dataArchive) {
        await cluster.extractDataDirectory(installPath, options.dataArchive);
      }
      if (options.plugins) {
        await cluster.installPlugins(installPath, options.plugins, options.esJavaOpts);
      }
      if (typeof options.secureFiles === 'string' && options.secureFiles) {
        const pairs = options.secureFiles
          .split(',')
          .map((kv) => kv.split('=').map((v) => v.trim()));
        await cluster.configureKeystoreWithSecureSettingsFiles(installPath, pairs);
      }

      reportTime(installStartTime, 'installed', {
        success: true,
        ...options,
      });

      if (options.eis) {
        // EIS mode: start ES, resolve the CCM API key, set it, then wait for
        // shutdown. We use cluster.start() (returns when ES is ready) instead of
        // cluster.run() (blocks until exit) so we can perform the CCM setup
        // in between.
        await cluster.start(installPath, {
          reportTime,
          startTime: runStartTime,
          ...options,
          esStdoutLogLevel: options.esLogLevel || 'info',
          readyTimeout: parseTimeoutToMs(options.readyTimeout),
          onEarlyExit: (msg) => {
            log.error(`ES exited unexpectedly: ${msg}`);
            process.exit(1);
          },
        });

        try {
          const protocol = options.ssl ? 'https' : 'http';
          const es = {
            baseUrl: `${protocol}://localhost:${options.port || 9200}`,
            credentials: { username: 'elastic', password: options.password || 'changeme' },
            ssl: !!options.ssl,
          };

          const apiKey = await resolveCcmApiKey(log);
          await setCcmApiKey(apiKey, es, log);
          log.success('EIS: CCM API key set in Elasticsearch');
        } catch (error) {
          log.error('EIS setup failed, stopping Elasticsearch...');
          await cluster.stop();
          throw error;
        }

        // Keep the process alive until the user sends SIGINT/SIGTERM (Ctrl+C).
        await new Promise<void>((resolve) => {
          const shutdown = () => {
            cluster.stop().finally(resolve);
          };
          process.on('SIGINT', shutdown);
          process.on('SIGTERM', shutdown);
        });
      } else {
        await cluster.run(installPath, {
          reportTime,
          startTime: runStartTime,
          ...options,
          esStdoutLogLevel: options.esLogLevel || 'info',
          readyTimeout: parseTimeoutToMs(options.readyTimeout),
        });
      }
    }
  },
};
