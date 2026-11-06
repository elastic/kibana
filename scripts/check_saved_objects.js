/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/setup-node-env/setup_env');

require('@kbn/swc-register').install({ ignore: [/\.(?:js|ts|tsx)$/] });
require('@babel/register')({
  extensions: ['.js', '.ts', '.tsx'],
  presets: [require.resolve('@kbn/babel-preset/node_preset')],
  babelrc: false,
  sourceMaps: 'both',
});

require('@kbn/security-hardening');
require('@kbn/check-saved-objects-cli').runCheckSavedObjectsCli();
