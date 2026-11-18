/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

// Vitest counterpart of @kbn/jest's src/setup/mocks.moment_timezone.js: pin the guessed timezone
// so results don't depend on the machine running the tests.
vi.mock('moment-timezone', async (importOriginal) => {
  const actual = await importOriginal();
  const moment = actual.default ?? actual;
  moment.tz.guess = () => 'America/New_York';
  moment.tz.setDefault('America/New_York');
  return actual;
});
