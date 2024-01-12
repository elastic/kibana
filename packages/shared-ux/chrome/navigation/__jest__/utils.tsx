/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import type { ChromeProjectNavigation, NavigationTreeDefinition } from '@kbn/core-chrome-browser';

import { EuiThemeProvider } from '@elastic/eui';
import { getServicesMock } from '../mocks/src/jest';
import { NavigationProvider } from '../src/services';
import { Navigation } from '../src/ui/navigation';
import type { PanelContentProvider } from '../src/ui';
import { NavigationServices } from '../src/types';

const services = getServicesMock();

export type ProjectNavigationChangeListener = (projectNavigation: ChromeProjectNavigation) => void;

export const renderNavigation = ({
  navTreeDef,
  services: overrideServices = {},
  onProjectNavigationChange = () => undefined,
  panelContentProvider,
}: {
  navTreeDef: NavigationTreeDefinition;
  services?: Partial<NavigationServices>;
  onProjectNavigationChange?: ProjectNavigationChangeListener;
  panelContentProvider?: PanelContentProvider;
}): RenderResult => {
  const renderResult = render(
    <EuiThemeProvider>
      <NavigationProvider
        {...services}
        {...overrideServices}
        onProjectNavigationChange={onProjectNavigationChange}
      >
        <Navigation navigationTree={navTreeDef} panelContentProvider={panelContentProvider} />
      </NavigationProvider>
    </EuiThemeProvider>
  );

  return renderResult;
};

type ArgsType<T> = T extends (...args: infer A) => any ? A : never;

export function getMockFn<T extends (...args: any[]) => any>() {
  return jest.fn() as jest.Mock<T, ArgsType<T>>;
}
