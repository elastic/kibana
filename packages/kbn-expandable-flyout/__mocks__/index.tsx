/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { IStorage } from '@kbn/kibana-utils-plugin/public';

export const useExpandableFlyoutApi = jest.fn(() => ({
  openFlyout: jest.fn(),
  closeFlyout: jest.fn(),
  openPanels: jest.fn(),
  openRightPanel: jest.fn(),
  openLeftPanel: jest.fn(),
  openPreviewPanel: jest.fn(),
  closeRightPanel: jest.fn(),
  closeLeftPanel: jest.fn(),
  closePreviewPanel: jest.fn(),
  closePanels: jest.fn(),
  previousPreviewPanel: jest.fn(),
}));

export const useExpandableFlyoutState = jest.fn();

export const ExpandableFlyoutProvider = jest.fn(({ children }: React.PropsWithChildren<{}>) => {
  return <>{children}</>;
});

export const withExpandableFlyoutProvider = <T extends object>(
  Component: React.ComponentType<T>
) => {
  return (props: T) => {
    return <Component {...props} />;
  };
};

export const ExpandableFlyout = jest.fn();

export const localStorageMock = (): IStorage => {
  let store: Record<string, unknown> = {};

  return {
    getItem: (key: string) => {
      return store[key] || null;
    },
    setItem: (key: string, value: unknown) => {
      store[key] = value;
    },
    clear() {
      store = {};
    },
    removeItem(key: string) {
      delete store[key];
    },
  };
};
