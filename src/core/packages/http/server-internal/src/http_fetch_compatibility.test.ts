/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

it('verify that we use exactly the same `undici` version at both the application and runtime levels', async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  expect(process.versions.undici).toEqual(require('undici/package.json').version);
});
