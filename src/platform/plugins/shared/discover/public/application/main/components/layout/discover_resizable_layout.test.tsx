/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type DiscoverResizableLayoutProps,
  DiscoverResizableLayout as OriginalDiscoverResizableLayout,
  SIDEBAR_WIDTH_KEY,
} from './discover_resizable_layout';
import type { SidebarToggleState } from '../../../types';
import {
  type ResizableLayoutProps,
  ResizableLayoutDirection,
  ResizableLayoutMode,
} from '@kbn/resizable-layout';
import { BehaviorSubject } from 'rxjs';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import { isEqual } from 'lodash';
import { render, screen } from '@testing-library/react';
import React from 'react';

const DEFAULT_RESIZABLE_PANEL_SIZE = 304;
const MOCK_SIDEBAR_KEY = SIDEBAR_WIDTH_KEY;

let lastResizableLayoutProps: ResizableLayoutProps | null = null;
let mockIsMobile = false;
let mockSidebarWidth: number | undefined;

const services = createDiscoverServicesMock();
services.storage.get = jest.fn((key: string) => {
  if (key === MOCK_SIDEBAR_KEY) return mockSidebarWidth;
  throw new Error(`Unexpected key: ${key}`);
});

jest.mock('@kbn/resizable-layout', () => {
  const actual = jest.requireActual('@kbn/resizable-layout');
  const ActualResizableLayout = actual.ResizableLayout;

  return {
    ...actual,
    ResizableLayout: (props: ResizableLayoutProps) => {
      lastResizableLayoutProps = props;
      return ActualResizableLayout(props);
    },
  };
});

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    useIsWithinBreakpoints: jest.fn(),
  };
});

import { useIsWithinBreakpoints as useIsWithinBreakpointsImport } from '@elastic/eui';

const useIsWithinBreakpoints = jest.mocked(useIsWithinBreakpointsImport);

useIsWithinBreakpoints.mockImplementation((breakpoints: string[]) => {
  if (!isEqual(breakpoints, ['xs', 's'])) {
    throw new Error(`Unexpected breakpoints: ${breakpoints}`);
  }
  return mockIsMobile;
});

const DiscoverResizableLayout: React.FC<DiscoverResizableLayoutProps> = (props) => (
  <DiscoverTestProvider services={services}>
    <OriginalDiscoverResizableLayout {...props} />
  </DiscoverTestProvider>
);

describe('DiscoverResizableLayout', () => {
  beforeEach(() => {
    mockSidebarWidth = undefined;
    mockIsMobile = false;
    lastResizableLayoutProps = null;
  });

  it('should render sidebarPanel and mainPanel', () => {
    render(
      <DiscoverResizableLayout
        mainPanel={<div data-test-subj="mainPanel" />}
        sidebarPanel={<div data-test-subj="sidebarPanel" />}
        sidebarToggleState$={
          new BehaviorSubject<SidebarToggleState>({
            isCollapsed: true,
            toggle: () => {},
          })
        }
      />
    );

    expect(screen.getByTestId('sidebarPanel')).toBeVisible();
    expect(screen.getByTestId('mainPanel')).toBeVisible();
  });

  it('should use the default sidebar width when no value is stored in local storage', () => {
    render(
      <DiscoverResizableLayout
        mainPanel={<div data-test-subj="mainPanel" />}
        sidebarPanel={<div data-test-subj="sidebarPanel" />}
        sidebarToggleState$={
          new BehaviorSubject<SidebarToggleState>({
            isCollapsed: true,
            toggle: () => {},
          })
        }
      />
    );

    expect(lastResizableLayoutProps?.fixedPanelSize).toBe(DEFAULT_RESIZABLE_PANEL_SIZE);
  });

  it('should use the stored sidebar width from local storage', () => {
    mockSidebarWidth = 400;

    render(
      <DiscoverResizableLayout
        mainPanel={<div data-test-subj="mainPanel" />}
        sidebarPanel={<div data-test-subj="sidebarPanel" />}
        sidebarToggleState$={
          new BehaviorSubject<SidebarToggleState>({
            isCollapsed: true,
            toggle: () => {},
          })
        }
      />
    );

    expect(lastResizableLayoutProps?.fixedPanelSize).toBe(mockSidebarWidth);
  });

  it('should use the restored sidebar width despite local storage value', () => {
    mockSidebarWidth = 400;
    const INITIAL_SIDEBAR_WIDTH = 450;

    render(
      <DiscoverResizableLayout
        initialState={{
          sidebarWidth: INITIAL_SIDEBAR_WIDTH,
        }}
        mainPanel={<div data-test-subj="mainPanel" />}
        sidebarPanel={<div data-test-subj="sidebarPanel" />}
        sidebarToggleState$={
          new BehaviorSubject<SidebarToggleState>({
            isCollapsed: true,
            toggle: () => {},
          })
        }
      />
    );

    expect(lastResizableLayoutProps?.fixedPanelSize).toBe(INITIAL_SIDEBAR_WIDTH);
  });

  it('should pass mode ResizableLayoutMode.Resizable when not mobile and sidebar is not collapsed', () => {
    mockIsMobile = false;

    render(
      <DiscoverResizableLayout
        mainPanel={<div data-test-subj="mainPanel" />}
        sidebarPanel={<div data-test-subj="sidebarPanel" />}
        sidebarToggleState$={
          new BehaviorSubject<SidebarToggleState>({
            isCollapsed: false,
            toggle: () => {},
          })
        }
      />
    );

    expect(lastResizableLayoutProps?.mode).toBe(ResizableLayoutMode.Resizable);
  });

  it('should pass mode ResizableLayoutMode.Static when mobile', () => {
    mockIsMobile = true;

    render(
      <DiscoverResizableLayout
        mainPanel={<div data-test-subj="mainPanel" />}
        sidebarPanel={<div data-test-subj="sidebarPanel" />}
        sidebarToggleState$={
          new BehaviorSubject<SidebarToggleState>({
            isCollapsed: false,
            toggle: () => {},
          })
        }
      />
    );

    expect(lastResizableLayoutProps?.mode).toBe(ResizableLayoutMode.Static);
  });

  it('should pass mode ResizableLayoutMode.Static when not mobile and sidebar is collapsed', () => {
    mockIsMobile = false;

    render(
      <DiscoverResizableLayout
        mainPanel={<div data-test-subj="mainPanel" />}
        sidebarPanel={<div data-test-subj="sidebarPanel" />}
        sidebarToggleState$={
          new BehaviorSubject<SidebarToggleState>({
            isCollapsed: true,
            toggle: () => {},
          })
        }
      />
    );

    expect(lastResizableLayoutProps?.mode).toBe(ResizableLayoutMode.Static);
  });

  it('should pass direction ResizableLayoutDirection.Horizontal when not mobile', () => {
    mockIsMobile = false;

    render(
      <DiscoverResizableLayout
        mainPanel={<div data-test-subj="mainPanel" />}
        sidebarPanel={<div data-test-subj="sidebarPanel" />}
        sidebarToggleState$={
          new BehaviorSubject<SidebarToggleState>({
            isCollapsed: false,
            toggle: () => {},
          })
        }
      />
    );

    expect(lastResizableLayoutProps?.direction).toBe(ResizableLayoutDirection.Horizontal);
  });

  it('should pass direction ResizableLayoutDirection.Vertical when mobile', () => {
    mockIsMobile = true;

    render(
      <DiscoverResizableLayout
        mainPanel={<div data-test-subj="mainPanel" />}
        sidebarPanel={<div data-test-subj="sidebarPanel" />}
        sidebarToggleState$={
          new BehaviorSubject<SidebarToggleState>({
            isCollapsed: false,
            toggle: () => {},
          })
        }
      />
    );

    expect(lastResizableLayoutProps?.direction).toBe(ResizableLayoutDirection.Vertical);
  });
});
