/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { AvailabilityService } from './availability_service';

export const createAvailabilityServiceMock = (): jest.Mocked<AvailabilityService> => {
  const mock: jest.Mocked<PublicMethodsOf<AvailabilityService>> = {
    setLicense$: jest.fn(),
    setUnavailableInServerlessTier: jest.fn(),
    getAvailabilityStatus$: jest.fn(() => of({ isAvailable: true })),
    getIsAvailable$: jest.fn(() => of(true)),
    getAvailabilityStatus: jest.fn(() => ({ isAvailable: true })),
    stop: jest.fn(),
  };
  return mock as jest.Mocked<AvailabilityService>;
};
