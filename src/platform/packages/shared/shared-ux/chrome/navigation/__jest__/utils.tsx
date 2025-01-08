/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { BehaviorSubject, of } from 'rxjs';
import type { Observable } from 'rxjs';
import type {
  NavigationTreeDefinitionUI,
  ChromeProjectNavigationNode,
} from '@kbn/core-chrome-browser';
import { EuiThemeProvider } from '@elastic/eui';

import { NavigationProvider } from '../src/services';
import { Navigation } from '../src/ui/navigation';
import type { PanelContentProvider } from '../src/ui';
import { NavigationServices } from '../src/types';
import { EventTracker } from '../src/analytics';

const activeNodes: ChromeProjectNavigationNode[][] = [];

export const getServicesMock = (): NavigationServices => {
  const navigateToUrl = jest.fn().mockResolvedValue(undefined);
  const basePath = { prepend: jest.fn((path: string) => `/base${path}`), remove: jest.fn() };
  const recentlyAccessed$ = new BehaviorSubject([]);
  const eventTracker = new EventTracker({ reportEvent: jest.fn() });

  return {
    basePath,
    recentlyAccessed$,
    navigateToUrl,
    activeNodes$: of(activeNodes),
    isSideNavCollapsed: false,
    eventTracker,
    isFeedbackBtnVisible$: of(false),
  };
};

const services = getServicesMock();

export const renderNavigation = ({
  navTreeDef,
  services: overrideServices = {},
  panelContentProvider,
}: {
  navTreeDef: Observable<NavigationTreeDefinitionUI>;
  services?: Partial<NavigationServices>;
  panelContentProvider?: PanelContentProvider;
}): RenderResult => {
  const renderResult = render(
    <EuiThemeProvider>
      <NavigationProvider {...services} {...overrideServices}>
        <Navigation navigationTree$={navTreeDef} panelContentProvider={panelContentProvider} />
      </NavigationProvider>
    </EuiThemeProvider>
  );

  return renderResult;
};
