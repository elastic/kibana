/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';

import { coreServices } from '../../services/kibana_services';
import {
  resetDashboardSideNavAutoCollapsePreference,
  useCollapseSideNav,
} from './use_collapse_side_nav';

const collapsed$ = new BehaviorSubject(false);

const TestComponent = ({ enabled = true }: { enabled?: boolean }) => {
  useCollapseSideNav(enabled);
  return null;
};

describe('useCollapseSideNav', () => {
  beforeEach(() => {
    resetDashboardSideNavAutoCollapsePreference();
    collapsed$.next(false);
    (coreServices.chrome.sideNav.getIsCollapsed$ as jest.Mock).mockReturnValue(collapsed$);
    (coreServices.chrome.sideNav.setIsCollapsed as jest.Mock).mockImplementation((isCollapsed) => {
      collapsed$.next(isCollapsed);
    });
    (coreServices.chrome.sideNav.setIsCollapsed as jest.Mock).mockClear();
  });

  it('auto-collapses the side nav on mount', async () => {
    render(<TestComponent />);

    await waitFor(() => {
      expect(coreServices.chrome.sideNav.setIsCollapsed).toHaveBeenCalledWith(true);
    });
  });

  it('does not auto-collapse again after the user manually toggles the nav', async () => {
    const { unmount } = render(<TestComponent />);

    await waitFor(() => {
      expect(coreServices.chrome.sideNav.setIsCollapsed).toHaveBeenCalledWith(true);
    });

    (coreServices.chrome.sideNav.setIsCollapsed as jest.Mock).mockClear();
    collapsed$.next(false);

    unmount();
    render(<TestComponent />);

    await waitFor(() => {
      expect(coreServices.chrome.sideNav.setIsCollapsed).not.toHaveBeenCalled();
    });
  });

  it('auto-collapses again after leaving and re-entering the dashboards app', async () => {
    const { unmount } = render(<TestComponent />);

    await waitFor(() => {
      expect(coreServices.chrome.sideNav.setIsCollapsed).toHaveBeenCalledWith(true);
    });

    collapsed$.next(false);
    unmount();

    resetDashboardSideNavAutoCollapsePreference();
    (coreServices.chrome.sideNav.setIsCollapsed as jest.Mock).mockClear();

    render(<TestComponent />);

    await waitFor(() => {
      expect(coreServices.chrome.sideNav.setIsCollapsed).toHaveBeenCalledWith(true);
    });
  });

  it('does not auto-collapse when disabled', async () => {
    render(<TestComponent enabled={false} />);

    await waitFor(() => {
      expect(coreServices.chrome.sideNav.setIsCollapsed).not.toHaveBeenCalled();
    });
  });
});
