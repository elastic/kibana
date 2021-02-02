/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { StatusService } from './status_service';
import {
  InternalStatusServiceSetup,
  StatusServiceSetup,
  ServiceStatusLevels,
  ServiceStatus,
  CoreStatus,
} from './types';
import { BehaviorSubject } from 'rxjs';

const available: ServiceStatus = {
  level: ServiceStatusLevels.available,
  summary: 'Service is working',
};
const availableCoreStatus: CoreStatus = {
  elasticsearch: available,
  savedObjects: available,
};

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<StatusServiceSetup> = {
    core$: new BehaviorSubject(availableCoreStatus),
    overall$: new BehaviorSubject(available),
    set: jest.fn(),
    dependencies$: new BehaviorSubject({}),
    derivedStatus$: new BehaviorSubject(available),
    isStatusPageAnonymous: jest.fn().mockReturnValue(false),
  };

  return setupContract;
};

const createInternalSetupContractMock = () => {
  const setupContract: jest.Mocked<InternalStatusServiceSetup> = {
    core$: new BehaviorSubject(availableCoreStatus),
    overall$: new BehaviorSubject(available),
    isStatusPageAnonymous: jest.fn().mockReturnValue(false),
    plugins: {
      set: jest.fn(),
      getDependenciesStatus$: jest.fn(),
      getDerivedStatus$: jest.fn(),
    },
  };

  return setupContract;
};

type StatusServiceContract = PublicMethodsOf<StatusService>;

const createMock = () => {
  const mocked: jest.Mocked<StatusServiceContract> = {
    setup: jest.fn().mockReturnValue(createInternalSetupContractMock()),
    start: jest.fn(),
    stop: jest.fn(),
  };
  return mocked;
};

export const statusServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createInternalSetupContract: createInternalSetupContractMock,
};
