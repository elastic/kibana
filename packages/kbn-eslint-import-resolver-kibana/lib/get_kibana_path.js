/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const { resolve } = require('path');

const { debug } = require('./debug');

const DEFAULT_PLUGIN_PATH = '../..';

/*
 * Resolves the path to Kibana, either from default setting or config
 */
exports.getKibanaPath = function (config, projectRoot) {
  const inConfig = config != null && config.kibanaPath;

  // We only allow `.` in the config as we need it for Kibana itself
  if (inConfig && config.kibanaPath !== '.') {
    throw new Error(
      'The `kibanaPath` option has been removed from `eslint-import-resolver-kibana`. ' +
        'During development your plugin must live in `./plugins/{pluginName}` ' +
        'inside the Kibana folder or `../kibana-extra/{pluginName}` ' +
        'relative to the Kibana folder to work with this package.'
    );
  }

  const kibanaPath = inConfig
    ? resolve(projectRoot, config.kibanaPath)
    : resolve(projectRoot, DEFAULT_PLUGIN_PATH);

  debug(`Resolved Kibana path: ${kibanaPath}`);
  return kibanaPath;
};
