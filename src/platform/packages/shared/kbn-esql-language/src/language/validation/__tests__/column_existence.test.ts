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

  it('returns a warning instead of an error when unmapped_fields is LOAD or NULLIFY', async () => {
    const { expectErrors } = await setup();
    await expectErrors(
      'SET unmapped_fields = "LOAD"; FROM index | WHERE unmapped == ""',
      [],
      [
        `"unmapped" column isn't mapped in any searched indices.\nIf you are not intentionally referencing an unmapped field,\ncheck that the field exists or that it is spelled correctly in your query.`,
      ]
    );
  });

  it('only returns one warning for the same unmapped column', async () => {
    const { expectErrors } = await setup();
    await expectErrors(
      'SET unmapped_fields = "LOAD"; FROM index | WHERE unmapped == "" | KEEP unmapped',
      [],
      [
        `"unmapped" column isn't mapped in any searched indices.\nIf you are not intentionally referencing an unmapped field,\ncheck that the field exists or that it is spelled correctly in your query.`,
      ]
    );
  });
});
