/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFailError } from '@kbn/dev-cli-errors';

export function quietFail(msg: string): never {
  throw createFailError(
    `${msg}${
      process.env.CI
        ? ` (in order to avoid potential info leaks, we've hidden the logging output. Please run this command locally with --debug to get logging output)`
        : ''
    }`
  );
}
