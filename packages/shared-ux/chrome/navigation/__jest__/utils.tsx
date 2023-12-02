/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import type { ChromeProjectNavigation } from '@kbn/core-chrome-browser';

import { EuiThemeProvider } from '@elastic/eui';
import { getServicesMock } from '../mocks/src/jest';
import { NavigationProvider } from '../src/services';
import { DefaultNavigation } from '../src/ui/default_navigation';
import type { PanelContentProvider } from '../src/ui';
import type { NavigationTreeDefinition, ProjectNavigationTreeDefinition } from '../src/ui/types';
import { NavigationServices } from '../types';

const services = getServicesMock();

export type ProjectNavigationChangeListener = (projectNavigation: ChromeProjectNavigation) => void;
export type TestType = 'treeDef' | 'uiComponents';

export const renderNavigation = ({
  navTreeDef,
  projectNavigationTree,
  navigationElement,
  services: overrideServices = {},
  onProjectNavigationChange = () => undefined,
  panelContentProvider,
}: {
  navTreeDef?: NavigationTreeDefinition;
  projectNavigationTree?: ProjectNavigationTreeDefinition;
  navigationElement?: React.ReactElement;
  services?: Partial<NavigationServices>;
  onProjectNavigationChange?: ProjectNavigationChangeListener;
  panelContentProvider?: PanelContentProvider;
}): RenderResult => {
  const element = navigationElement ?? (
    <DefaultNavigation
      projectNavigationTree={projectNavigationTree}
      navigationTree={navTreeDef}
      panelContentProvider={panelContentProvider}
    />
  );

  const renderResult = render(
    <EuiThemeProvider>
      <NavigationProvider
        {...services}
        {...overrideServices}
        onProjectNavigationChange={onProjectNavigationChange}
      >
        {element}
      </NavigationProvider>
    </EuiThemeProvider>
  );

  return renderResult;
};

export const errorHandler = (type: TestType) => (e: Error) => {
  const err = new Error(`Failed to run tests for ${type}.`);
  err.stack = e.stack;
  // eslint-disable-next-line no-console
  console.error(err.message);
  throw err;
};

type ArgsType<T> = T extends (...args: infer A) => any ? A : never;

export function getMockFn<T extends (...args: any[]) => any>() {
  return jest.fn() as jest.Mock<T, ArgsType<T>>;
}
