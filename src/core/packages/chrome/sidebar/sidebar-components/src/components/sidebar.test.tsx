/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { z } from '@kbn/zod/v4';
import type { SidebarAppConfig, SidebarAppId, SidebarStart } from '@kbn/core-chrome-sidebar';
import { createSidebarStore } from '@kbn/core-chrome-sidebar';
import { SidebarService } from '@kbn/core-chrome-sidebar-internal';
import { SidebarServiceProvider } from '@kbn/core-chrome-sidebar-context';
import { ChromeLayoutConfigProvider } from '@kbn/core-chrome-layout-components';
import type { SidebarComponentType } from '@kbn/core-chrome-sidebar';
import { Sidebar } from './sidebar';

// Mock only SidebarBody — its Emotion styles access euiTheme tokens that require EuiProvider.
// Everything else (SidebarPanel, PanelResizeHandle, hooks, service) runs real.
jest.mock('./sidebar_panel_body', () => ({
  SidebarBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const TEST_APP_ID: SidebarAppId = 'sidebarExampleTest';
const STATEFUL_APP_ID: SidebarAppId = 'sidebarExampleStateful';

const TestComponent = jest.fn((_props: Record<string, unknown>) => <div>Sidebar App Content</div>);

/** Single cast point — TestComponent is a mock that accepts any sidebar component props */
const loadTestComponent = () => Promise.resolve(TestComponent as unknown as SidebarComponentType);

const testStore = createSidebarStore({
  schema: z.object({ count: z.number().default(0) }),
  actions: (set) => ({
    setCount: (count: number) => set({ count }),
  }),
});

const startService = (...apps: Array<SidebarAppConfig<any, any>>): SidebarStart => {
  const service = new SidebarService({ basePath: '/test' });
  const setup = service.setup();
  apps.forEach((app) => setup.registerApp(app));
  return service.start();
};

const renderSidebar = (sidebar: SidebarStart) =>
  render(
    <ChromeLayoutConfigProvider value={{ chromeStyle: 'classic' }}>
      <SidebarServiceProvider value={{ sidebar }}>
        <Sidebar />
      </SidebarServiceProvider>
    </ChromeLayoutConfigProvider>
  );

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders nothing when sidebar is closed', () => {
    const sidebar = startService({
      appId: TEST_APP_ID,
      loadComponent: loadTestComponent,
    });

    const { container } = renderSidebar(sidebar);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows loading skeleton while app status is pending', () => {
    const sidebar = startService({
      appId: TEST_APP_ID,
      status: 'pending',
      loadComponent: loadTestComponent,
    });
    sidebar.getApp(TEST_APP_ID).open();

    renderSidebar(sidebar);

    expect(screen.getByLabelText('Loading side panel')).toBeInTheDocument();
    expect(screen.queryByText('Sidebar App Content')).not.toBeInTheDocument();
  });

  it('passes store props to stateful apps and only onClose to stateless apps', async () => {
    const sidebar = startService(
      { appId: STATEFUL_APP_ID, loadComponent: loadTestComponent, store: testStore },
      { appId: TEST_APP_ID, loadComponent: loadTestComponent }
    );

    // Stateful app: receives state, actions, and onClose
    sidebar.getApp(STATEFUL_APP_ID).open();
    const { unmount } = renderSidebar(sidebar);

    await waitFor(() => {
      expect(screen.getByText('Sidebar App Content')).toBeInTheDocument();
    });
    expect(TestComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        onClose: expect.any(Function),
        state: { count: 0 },
        actions: expect.objectContaining({ setCount: expect.any(Function) }),
      }),
      expect.anything()
    );

    unmount();
    TestComponent.mockClear();

    // Stateless app: receives only onClose
    sidebar.close();
    sidebar.getApp(TEST_APP_ID).open();
    renderSidebar(sidebar);

    await waitFor(() => {
      expect(screen.getByText('Sidebar App Content')).toBeInTheDocument();
    });
    const { onClose, ...rest } = TestComponent.mock.calls[0][0];
    expect(onClose).toEqual(expect.any(Function));
    expect(rest).toEqual({});
  });
});
