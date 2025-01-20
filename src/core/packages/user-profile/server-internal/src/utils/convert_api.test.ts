/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-server';
import { convertUserProfileAPI } from './convert_api';

describe('convertUserProfileAPI', () => {
  it('returns the API from the source', () => {
    const source: CoreUserProfileDelegateContract = {
      getCurrent: jest.fn(),
      bulkGet: jest.fn(),
      suggest: jest.fn(),
      update: jest.fn(),
    };

    const output = convertUserProfileAPI(source);

    expect(output.getCurrent).toBe(source.getCurrent);
    expect(output.bulkGet).toBe(source.bulkGet);
    expect(output.suggest).toBe(source.suggest);
    expect(output.update).toBe(source.update);
  });
});
