/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConfigDeprecationProvider, ConfigDeprecation } from '@kbn/config';

const rewriteBasePathDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (settings.server?.basePath && !settings.server?.rewriteBasePath) {
    addDeprecation({
      configPath: 'server.basePath',
      title: 'Setting "server.rewriteBasePath" should be set when using "server.basePath"',
      message:
        'You should set server.basePath along with server.rewriteBasePath. Starting in 7.0, Kibana ' +
        'will expect that all requests start with server.basePath rather than expecting you to rewrite ' +
        'the requests in your reverse proxy. Set server.rewriteBasePath to false to preserve the ' +
        'current behavior and silence this warning.',
      level: 'warning',
      correctiveActions: {
        manualSteps: [
          `Set 'server.rewriteBasePath' in the config file, CLI flag, or environment variable (in Docker only).`,
          `Set to false to preserve the current behavior and silence this warning.`,
        ],
      },
    });
  }
};

const rewriteCorsSettings: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  const corsSettings = settings.server?.cors;
  if (typeof corsSettings === 'boolean') {
    addDeprecation({
      configPath: 'server.cors',
      title: 'Setting "server.cors" is deprecated',
      message: '"server.cors" is deprecated and has been replaced by "server.cors.enabled"',
      level: 'warning',
      correctiveActions: {
        manualSteps: [
          `Replace "server.cors: ${corsSettings}" with "server.cors.enabled: ${corsSettings}"`,
        ],
      },
    });

    return {
      set: [{ path: 'server.cors', value: { enabled: corsSettings } }],
    };
  }
};

export const coreDeprecationProvider: ConfigDeprecationProvider = () => [
  rewriteCorsSettings,
  rewriteBasePathDeprecation,
];
