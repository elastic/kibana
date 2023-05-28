/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { findSpecs } from '../specMatcher';

describe('Spec Matcher', () => {
  it('runs multiple spec files when comma separated', async () => {
    await findSpecs({
      projectRoot: __dirname,
      testingType: 'e2e',
      specPattern: ['fixtures/*.cy.ts'],
      configSpecPattern: ['fixtures/*.cy.ts'],
      excludeSpecPattern: [],
      additionalIgnorePattern: [],
    });
  });
});
