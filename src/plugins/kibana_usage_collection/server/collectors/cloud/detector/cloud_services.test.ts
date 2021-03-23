/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CLOUD_SERVICES } from './cloud_services';
import { AWS } from './aws';
import { AZURE } from './azure';
import { GCP } from './gcp';

describe('cloudServices', () => {
  const expectedOrder = [AWS, GCP, AZURE];

  it('iterates in expected order', () => {
    let i = 0;
    for (const service of CLOUD_SERVICES) {
      expect(service).toBe(expectedOrder[i++]);
    }
  });
});
