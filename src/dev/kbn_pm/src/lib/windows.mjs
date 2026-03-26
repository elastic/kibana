/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @param {import('./log.mjs').Log} log
 */
export function checkIfRunningNativelyOnWindows(log) {
  if (process.platform !== 'win32') {
    return;
  }

  log.error(
    'We no longer support natively bootstrap Kibana on Windows. Please check our documentation on how you can develop on Windows at https://docs.elastic.dev/kibana-dev-docs/tutorial/setup-windows-development-wsl'
  );
  process.exit(1);
}
