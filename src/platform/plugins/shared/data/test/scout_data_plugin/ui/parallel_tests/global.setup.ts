/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook } from '@kbn/scout';

globalSetupHook(
  'Load Shakespeare for session lifecycle tests',
  { tag: '@local-stateful-classic' },
  async ({ esArchiver }) => {
    // Retain this shared, read-only archive for other Scout suites using loadIfNeeded.
    await esArchiver.loadIfNeeded(
      'src/platform/test/functional/fixtures/es_archiver/getting_started/shakespeare'
    );
  }
);
