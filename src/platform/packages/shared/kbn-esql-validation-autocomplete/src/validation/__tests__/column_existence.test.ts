/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';

describe('column existence checks', () => {
  it('looks behind current command', async () => {
    const { expectErrors } = await setup();
    await expectErrors('FROM index | DROP keywordField | KEEP keywordField', [
      'Unknown column "keywordField"',
    ]);
  });

  it('treats FORK branches separately', async () => {
    const { expectErrors } = await setup();
    await expectErrors('FROM index | FORK (DROP keywordField) (KEEP keywordField)', []);
  });
});
