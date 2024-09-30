/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CiStats } from '#pipeline-utils';

(async () => {
  try {
    await CiStats.onComplete();
  } catch (ex) {
    console.error('CI Stats Error', ex.message);
    if (ex.response) {
      console.error('HTTP Error Response Status', ex.response.status);
      console.error('HTTP Error Response Body', ex.response.data);
    }
    process.exit(1);
  }
})();
