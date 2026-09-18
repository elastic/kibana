/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Synthetic stand-in for `playwright/page_objects/index.ts`'s
// `createCorePageObjects`, used only by audit.test.ts to validate
// `extractPageObjectKeys` without depending on the real file's exact shape.
// Valid TypeScript so the package type check does not need to exclude it.
class FakePageObject {}
const FakeDashboardApp = FakePageObject;
const FakeLensApp = FakePageObject;

const createLazyPageObject = <T>(PageObjectClass: new () => T, fixtures: unknown): T => {
  void fixtures;
  return new PageObjectClass();
};

export function createCorePageObjects(fixtures: unknown) {
  return {
    dashboard: createLazyPageObject(FakeDashboardApp, fixtures),
    lens: createLazyPageObject(FakeLensApp, fixtures),
  };
}
