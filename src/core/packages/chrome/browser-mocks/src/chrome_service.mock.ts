/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, of } from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import type { ChromeBadge, ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import type {
  ChromeService,
  InternalChromeSetup,
  InternalChromeStart,
} from '@kbn/core-chrome-browser-internal';
import { lazyObject } from '@kbn/lazy-object';
import { sidebarServiceMock } from '@kbn/core-chrome-sidebar-mocks';

const createSetupContractMock = (): DeeplyMockedKeys<InternalChromeSetup> => {
  return lazyObject({
    sidebar: lazyObject(sidebarServiceMock.createSetupContract()),
  });
};

const createStartContractMock = () => {
  const startContract: DeeplyMockedKeys<InternalChromeStart> = lazyObject({
    getClassicHeaderComponent: jest.fn(),
    getChromelessHeader: jest.fn(),
    getHeaderBanner: jest.fn(),
    getProjectAppMenuComponent: jest.fn(),
    getProjectHeaderComponent: jest.fn(),
    getProjectSideNavComponent: jest.fn(),
    getSidebarComponent: jest.fn(),
    withProvider: jest.fn((children) => children),
    sidebar: lazyObject(sidebarServiceMock.createStartContract()),
    navLinks: lazyObject({
      getNavLinks$: jest.fn(),
      has: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn().mockReturnValue([]),
    }),
    recentlyAccessed: lazyObject({
      add: jest.fn(),
      get: jest.fn(),
      get$: jest.fn(),
    }),
    docTitle: lazyObject({
      change: jest.fn(),
      reset: jest.fn(),
    }),
    navControls: lazyObject({
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
    }),
    setIsVisible: jest.fn(),
    getIsVisible$: jest.fn().mockReturnValue(new BehaviorSubject(false)),
    getBadge$: jest.fn().mockReturnValue(new BehaviorSubject({} as ChromeBadge)),
    setBadge: jest.fn(),
    getBreadcrumbs$: jest.fn().mockReturnValue(new BehaviorSubject([{} as ChromeBreadcrumb])),
    setBreadcrumbs: jest.fn(),
    sideNav: lazyObject({
      getIsCollapsed$: jest.fn().mockReturnValue(new BehaviorSubject(false)),
      setIsCollapsed: jest.fn(),
    }),
    getBreadcrumbsAppendExtensions$: jest.fn().mockReturnValue(new BehaviorSubject([])),
    setBreadcrumbsAppendExtension: jest.fn(),
    getGlobalHelpExtensionMenuLinks$: jest.fn().mockReturnValue(new BehaviorSubject([])),
    registerGlobalHelpExtensionMenuLink: jest.fn(),
    getHelpExtension$: jest.fn().mockReturnValue(new BehaviorSubject(undefined)),
    setHelpExtension: jest.fn(),
    setHelpMenuLinks: jest.fn(),
    setHelpSupportUrl: jest.fn(),
    getHelpSupportUrl$: jest.fn(() => of('https://www.elastic.co/support')),
    getCustomNavLink$: jest.fn().mockReturnValue(new BehaviorSubject(undefined)),
    setCustomNavLink: jest.fn(),
    setHeaderBanner: jest.fn(),
    hasHeaderBanner$: jest.fn().mockReturnValue(new BehaviorSubject(false)),
    getChromeStyle$: jest.fn().mockReturnValue(new BehaviorSubject('classic')),
    setChromeStyle: jest.fn(),
    getActiveSolutionNavId$: jest.fn(),
    project: lazyObject({
      setHome: jest.fn(),
      setCloudUrls: jest.fn(),
      setKibanaName: jest.fn(),
      initNavigation: jest.fn(),
      setBreadcrumbs: jest.fn(),
      getBreadcrumbs$: jest.fn(),
      getActiveNavigationNodes$: jest.fn(),
      getNavigationTreeUi$: jest.fn(),
      changeActiveSolutionNavigation: jest.fn(),
      updateSolutionNavigations: jest.fn(),
    }),
    setGlobalFooter: jest.fn(),
    getGlobalFooter$: jest.fn().mockReturnValue(new BehaviorSubject(null)),
    getAppMenu$: jest.fn().mockReturnValue(new BehaviorSubject(undefined)),
    setAppMenu: jest.fn(),
    setBreadcrumbsBadges: jest.fn(),
  });

  return startContract;
};

type ChromeServiceContract = PublicMethodsOf<ChromeService>;
const createMock = () => {
  const mocked: jest.Mocked<ChromeServiceContract> = lazyObject({
    setup: jest.fn().mockReturnValue(createSetupContractMock()),
    start: jest.fn().mockResolvedValue(createStartContractMock()),
    stop: jest.fn(),
  });

  return mocked;
};

export const chromeServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
