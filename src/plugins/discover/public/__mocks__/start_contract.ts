/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ApplicationStart, PublicAppInfo } from '@kbn/core/public';
import { deepFreeze } from '@kbn/std';
import { BehaviorSubject, Subject } from 'rxjs';

const capabilities = deepFreeze({
  catalogue: {},
  management: {},
  navLinks: {},
  discover: {
    show: true,
    edit: false,
  },
});

export const createStartContractMock = (): jest.Mocked<ApplicationStart> => {
  const currentAppId$ = new Subject<string | undefined>();

  return {
    applications$: new BehaviorSubject<Map<string, PublicAppInfo>>(new Map()),
    currentAppId$: currentAppId$.asObservable(),
    capabilities,
    navigateToApp: jest.fn(),
    navigateToUrl: jest.fn(),
    getUrlForApp: jest.fn(),
  };
};
