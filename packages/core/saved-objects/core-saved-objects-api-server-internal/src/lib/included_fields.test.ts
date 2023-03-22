/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getRootFields } from './included_fields';

describe('getRootFields', () => {
  it('returns copy of root fields', () => {
    const fields = getRootFields();
    expect(fields).toMatchInlineSnapshot(`
      Array [
        "namespace",
        "namespaces",
        "type",
        "references",
        "migrationVersion",
        "coreMigrationVersion",
        "typeMigrationVersion",
        "updated_at",
        "created_at",
        "originId",
      ]
    `);
  });
});
