/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

(() => {
  // npm_config_user_agent looks like `pnpm/9.15.9 npm/? node/v20 ...` for pnpm,
  // `npm/10 ...` for npm, `yarn/1.22 ...` for yarn classic.
  const userAgent = process.env.npm_config_user_agent || '';

  if (userAgent.startsWith('npm/') || userAgent.startsWith('yarn/')) {
    throw new Error(`Use pnpm instead, see Kibana's contributing guidelines`);
  }
})();
