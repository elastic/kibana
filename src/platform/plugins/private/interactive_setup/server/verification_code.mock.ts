/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicContract } from '@kbn/utility-types';

import type { VerificationCode } from './verification_code';

export const verificationCodeMock = {
  create: (): jest.Mocked<PublicContract<VerificationCode>> => ({
    code: '123456',
    remainingAttempts: 5,
    verify: jest.fn().mockReturnValue(true),
  }),
};
