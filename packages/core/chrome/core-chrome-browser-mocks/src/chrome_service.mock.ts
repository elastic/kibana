/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, of } from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import type { ChromeBadge, ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import type { ChromeService, InternalChromeStart } from '@kbn/core-chrome-browser-internal';

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
      registerExtension: jest.fn(),
      getLeft$: jest.fn(),
      getCenter$: jest.fn(),
      getRight$: jest.fn(),
      getExtension$: jest.fn(),
      setHelpMenuLinks: jest.fn(),
      getHelpMenuLinks$: jest.fn(),
    },
    setIsVisible: jest.fn(),
    getIsVisible$: jest.fn(),
    getBadge$: jest.fn(),
    setBadge: jest.fn(),
    getBreadcrumbs$: jest.fn(),
    setBreadcrumbs: jest.fn(),
    getIsSideNavCollapsed$: jest.fn(),
    getBreadcrumbsAppendExtension$: jest.fn(),
    setBreadcrumbsAppendExtension: jest.fn(),
    getGlobalHelpExtensionMenuLinks$: jest.fn(),
    registerGlobalHelpExtensionMenuLink: jest.fn(),
    getHelpExtension$: jest.fn(),
    setHelpExtension: jest.fn(),
    setHelpMenuLinks: jest.fn(),
    setHelpSupportUrl: jest.fn(),
    getHelpSupportUrl$: jest.fn(() => of('https://www.elastic.co/support')),
    getIsNavDrawerLocked$: jest.fn(),
    getCustomNavLink$: jest.fn(),
    setCustomNavLink: jest.fn(),
    setHeaderBanner: jest.fn(),
    hasHeaderBanner$: jest.fn(),
    getBodyClasses$: jest.fn(),
    getChromeStyle$: jest.fn(),
    setChromeStyle: jest.fn(),
    project: {
      setHome: jest.fn(),
      setProjectsUrl: jest.fn(),
      setProjectUrl: jest.fn(),
      setProjectName: jest.fn(),
      setNavigation: jest.fn(),
      setSideNavComponent: jest.fn(),
      setBreadcrumbs: jest.fn(),
      getActiveNavigationNodes$: jest.fn(),
    },
  };
  startContract.navLinks.getAll.mockReturnValue([]);
  startContract.getIsVisible$.mockReturnValue(new BehaviorSubject(false));
  startContract.getBadge$.mockReturnValue(new BehaviorSubject({} as ChromeBadge));
  startContract.getBreadcrumbs$.mockReturnValue(new BehaviorSubject([{} as ChromeBreadcrumb]));
  startContract.getBreadcrumbsAppendExtension$.mockReturnValue(new BehaviorSubject(undefined));
  startContract.getCustomNavLink$.mockReturnValue(new BehaviorSubject(undefined));
  startContract.getGlobalHelpExtensionMenuLinks$.mockReturnValue(new BehaviorSubject([]));
  startContract.getHelpExtension$.mockReturnValue(new BehaviorSubject(undefined));
  startContract.getIsNavDrawerLocked$.mockReturnValue(new BehaviorSubject(false));
  startContract.getBodyClasses$.mockReturnValue(new BehaviorSubject([]));
  startContract.hasHeaderBanner$.mockReturnValue(new BehaviorSubject(false));
  startContract.getIsSideNavCollapsed$.mockReturnValue(new BehaviorSubject(false));
  return startContract;
};

type ChromeServiceContract = PublicMethodsOf<ChromeService>;
const createMock = () => {
  const mocked: jest.Mocked<ChromeServiceContract> = {
    setup: jest.fn(),
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
