import { EuiThemeProvider } from '@elastic/eui';
import type {
  ChromeProjectNavigationNode,
  NavigationTreeDefinitionUI,
} from '@kbn/core-chrome-browser';
import { type RenderResult, render } from '@testing-library/react';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { BehaviorSubject, of } from 'rxjs';
import type { Observable } from 'rxjs';

import { NavigationProvider } from '../src/services';
import { NavigationServices } from '../src/types';
import type { PanelContentProvider } from '../src/ui';
import { Navigation } from '../src/ui/navigation';

const activeNodes: ChromeProjectNavigationNode[][] = [];

export const getServicesMock = (): NavigationServices => {
  const navigateToUrl = jest.fn().mockResolvedValue(undefined);
  const basePath = { prepend: jest.fn((path: string) => `/base${path}`) };
  const recentlyAccessed$ = new BehaviorSubject([]);

  return {
    basePath,
    recentlyAccessed$,
    navIsOpen: true,
    navigateToUrl,
    activeNodes$: of(activeNodes),
    isSideNavCollapsed: false,
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
