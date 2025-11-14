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
import type { ChromeService, InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import { lazyObject } from '@kbn/lazy-object';

const createStartContractMock = () => {
  const startContract: DeeplyMockedKeys<InternalChromeStart> = lazyObject({
    getLegacyHeaderComponentForFixedLayout: jest.fn(),
    getClassicHeaderComponentForGridLayout: jest.fn(),
    getChromelessHeader: jest.fn(),
    getHeaderBanner: jest.fn(),
    getProjectAppMenuComponent: jest.fn(),
    getProjectHeaderComponentForGridLayout: jest.fn(),
    getProjectSideNavComponentForGridLayout: jest.fn(),
    navLinks: lazyObject({
      getNavLinks$: jest.fn(),
      has: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn().mockReturnValue([]),
      enableForcedAppSwitcherNavigation: jest.fn(),
      getForceAppSwitcherNavigation$: jest.fn(),
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
      getIsFeedbackBtnVisible$: jest.fn(),
      setIsFeedbackBtnVisible: jest.fn(),
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
    getBodyClasses$: jest.fn().mockReturnValue(new BehaviorSubject([])),
    getChromeStyle$: jest.fn().mockReturnValue(new BehaviorSubject('classic')),
    setChromeStyle: jest.fn(),
    getActiveSolutionNavId$: jest.fn(),
    project: lazyObject({
      setHome: jest.fn(),
      setCloudUrls: jest.fn(),
      setKibanaName: jest.fn(),
      setFeedbackUrlParams: jest.fn(),
      initNavigation: jest.fn(),
      setBreadcrumbs: jest.fn(),
      getBreadcrumbs$: jest.fn(),
      getActiveNavigationNodes$: jest.fn(),
      getNavigationTreeUi$: jest.fn(),
      changeActiveSolutionNavigation: jest.fn(),
      updateSolutionNavigations: jest.fn(),
      navigationTourManager: {} as any,
    }),
    setGlobalFooter: jest.fn(),
    getGlobalFooter$: jest.fn(),
  });

  return startContract;
};

type ChromeServiceContract = PublicMethodsOf<ChromeService>;
const createMock = () => {
  const mocked: jest.Mocked<ChromeServiceContract> = lazyObject({
    setup: jest.fn(),
    start: jest.fn().mockResolvedValue(createStartContractMock()),
    stop: jest.fn(),
  });

  return mocked;
};

export const chromeServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};
