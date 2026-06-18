/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSHA256Hash } from '@kbn/crypto';
import { publicApiAccessStepDefinition } from './public_api_access_step';

describe('publicApiAccessStepDefinition', () => {
  it('has a stable handler hash for APPROVED_STEP_DEFINITIONS', () => {
    expect(createSHA256Hash(publicApiAccessStepDefinition.handler.toString())).toBe(
      'f50346b6b4f1fa5e087456baf0360b34304e33198b23980c4214496ff6834b54'
    );
  });
});
