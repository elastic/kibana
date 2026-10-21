/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Fixture file for audit.test.ts: a solution Scout package's own page object
// that composes a core page object. Lives under `kbn-scout-*/src/playwright`,
// not `test/scout*`, so it exercises the second path shape the census walks.
export class FakeSolutionPage {
  constructor(private readonly pageObjects: { lens: { goto(): Promise<void> } }) {}

  async open() {
    await this.pageObjects.lens.goto();
  }
}
