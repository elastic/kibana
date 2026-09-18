/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Fixture file for audit.test.ts: exercises property-access consumption.
// Not a real Scout spec (audit.test.ts parses this, never executes it), but
// it is valid TypeScript so the package type check does not need to exclude it.
interface FakePageObjects {
  dashboard: { goto(): Promise<void> };
}

export const usesDashboardViaProperty = async ({
  pageObjects,
}: {
  pageObjects: FakePageObjects;
}) => {
  await pageObjects.dashboard.goto();
};
