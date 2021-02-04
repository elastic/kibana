/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default async function ({ readConfigFile }) {
  const config4 = await readConfigFile(require.resolve('./config.4'));
  return {
    testFiles: ['baz'],
    screenshots: {
      ...config4.get('screenshots'),
    },
  };
}
