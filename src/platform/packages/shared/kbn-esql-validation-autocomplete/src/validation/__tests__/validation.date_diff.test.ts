/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';

describe('validation', () => {
  describe('command', () => {
    test('date_diff', async () => {
      const { expectErrors } = await setup();
      await expectErrors(
        'row var = date_diff("month", "2023-12-02T11:00:00.000Z", "2023-12-02T11:00:00.000Z")',
        []
      );
      await expectErrors(
        'row var = date_diff("mm", "2023-12-02T11:00:00.000Z", "2023-12-02T11:00:00.000Z")',
        []
      );
      await expectErrors(
        'row var = date_diff("bogus", "2023-12-02T11:00:00.000Z", "2023-12-02T11:00:00.000Z")',
        []
      );
    });
  });
});
