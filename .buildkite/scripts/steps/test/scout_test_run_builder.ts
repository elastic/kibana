/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { pickScoutTestGroupRunOrder, getKibanaDir } from '#pipeline-utils';

(async () => {
  try {
    const scoutConfigsPath = path.resolve(
      getKibanaDir(),
      '.scout',
      'test_configs',
      'scout_playwright_configs.json'
    );
    await pickScoutTestGroupRunOrder(scoutConfigsPath);
  } catch (ex) {
    console.error('Scout test grouping error: ', ex.message);
    if (ex.response) {
      console.error('HTTP Error Response Status', ex.response.status);
      console.error('HTTP Error Response Body', ex.response.data);
    }
    process.exit(1);
  }
})();
