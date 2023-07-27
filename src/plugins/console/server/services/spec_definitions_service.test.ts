/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SpecDefinitionsService } from '.';

describe('SpecDefinitionsService', () => {
  it('test', () => {
    const specDefinitionsService = new SpecDefinitionsService();
    specDefinitionsService.start({
      endpointsAvailability: 'stack',
    });
    const endpoints = specDefinitionsService.asJson().endpoints;
    expect(endpoints.length > 100);
  });
});
