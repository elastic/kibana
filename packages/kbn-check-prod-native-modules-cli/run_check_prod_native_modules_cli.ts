/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { checkProdNativeModules } from './check_prod_native_modules';

run(
  async ({ log }) => {
    const foundProdNativeModules = await checkProdNativeModules(log);
    if (foundProdNativeModules) {
      throw createFailError(
        'Failed: check all previous errors before continuing. Chat with the Kibana Operations Team if you do need help.'
      );
    }
  },
  {
    usage: `node scripts/check_prod_native_modules`,
    description:
      'Check if there are production dependencies that contains or installs dependencies that contain native modules and errors out on those cases',
  }
);
