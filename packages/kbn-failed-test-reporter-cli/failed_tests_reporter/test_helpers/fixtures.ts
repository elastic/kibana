/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Fs = jest.requireActual('fs');

export const FTR_REPORT = Fs.readFileSync(
  require.resolve('../__fixtures__/ftr_report.xml'),
  'utf8'
);
export const JEST_REPORT = Fs.readFileSync(
  require.resolve('../__fixtures__/jest_report.xml'),
  'utf8'
);
export const MOCHA_REPORT = Fs.readFileSync(
  require.resolve('../__fixtures__/mocha_report.xml'),
  'utf8'
);
export const CYPRESS_REPORT = Fs.readFileSync(
  require.resolve('../__fixtures__/cypress_report.xml'),
  'utf8'
);
