/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import { ChromeBadge, ChromeBreadcrumb, ChromeService, InternalChromeStart } from '.';

const createStartContractMock = () => {
  const startContract: DeeplyMockedKeys<InternalChromeStart> = {
    getHeaderComponent: jest.fn(),
    navLinks: {
      getNavLinks$: jest.fn(),
      has: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      enableForcedAppSwitcherNavigation: jest.fn(),
      getForceAppSwitcherNavigation$: jest.fn(),
    },
    recentlyAccessed: {
      add: jest.fn(),
      get: jest.fn(),
      get$: jest.fn(),
    },
    docTitle: {
      change: jest.fn(),
      reset: jest.fn(),
    },
    navControls: {
      registerLeft: jest.fn(),
      registerCenter: jest.fn(),
      registerRight: jest.fn(),
      getLeft$: jest.fn(),
      getCenter$: jest.fn(),
      getRight$: jest.fn(),
    },
    setIsVisible: jest.fn(),
    getIsVisible$: jest.fn(),
    getBadge$: jest.fn(),
    setBadge: jest.fn(),
    getBreadcrumbs$: jest.fn(),
    setBreadcrumbs: jest.fn(),
    getBreadcrumbsAppendExtension$: jest.fn(),
    setBreadcrumbsAppendExtension: jest.fn(),
    getHelpExtension$: jest.fn(),
    setHelpExtension: jest.fn(),
    setHelpSupportUrl: jest.fn(),
    getIsNavDrawerLocked$: jest.fn(),
    getCustomNavLink$: jest.fn(),
    setCustomNavLink: jest.fn(),
    setHeaderBanner: jest.fn(),
    hasHeaderBanner$: jest.fn(),
    getBodyClasses$: jest.fn(),
  };
  startContract.navLinks.getAll.mockReturnValue([]);
  startContract.getIsVisible$.mockReturnValue(new BehaviorSubject(false));
  startContract.getBadge$.mockReturnValue(new BehaviorSubject({} as ChromeBadge));
  startContract.getBreadcrumbs$.mockReturnValue(new BehaviorSubject([{} as ChromeBreadcrumb]));
  startContract.getBreadcrumbsAppendExtension$.mockReturnValue(new BehaviorSubject(undefined));
  startContract.getCustomNavLink$.mockReturnValue(new BehaviorSubject(undefined));
  startContract.getHelpExtension$.mockReturnValue(new BehaviorSubject(undefined));
  startContract.getIsNavDrawerLocked$.mockReturnValue(new BehaviorSubject(false));
  startContract.getBodyClasses$.mockReturnValue(new BehaviorSubject([]));
  startContract.hasHeaderBanner$.mockReturnValue(new BehaviorSubject(false));
  return startContract;
};

type ChromeServiceContract = PublicMethodsOf<ChromeService>;
const createMock = () => {
  const mocked: jest.Mocked<ChromeServiceContract> = {
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.start.mockResolvedValue(createStartContractMock());
  return mocked;
};

export const chromeServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};
