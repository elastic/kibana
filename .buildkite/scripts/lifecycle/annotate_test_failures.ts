/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TestFailures } from '#pipeline-utils';

(async () => {
  try {
    await TestFailures.annotateTestFailures();
  } catch (ex) {
    console.error(
      'Annotate test failures error',
      ex.message,
      ex?.stack || 'no stacktrace information'
    );
    if (ex.response) {
      const requestUrl = ex.response?.url || ex.response?.config?.url || '';
      console.error(
        `HTTP Error ${ex.response.status}/${ex.response.statusText} (${requestUrl})`,
        ex.response.data
      );
    }
    process.exit(1);
  }
})();
