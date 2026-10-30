/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { BehaviorSubject } from 'rxjs';
import { fireEvent, renderHook } from '@testing-library/react';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { initializeTrackPanel } from '../../dashboard_api/track_panel';
import type { DashboardChildren } from '../../dashboard_api/layout_manager/types';
import { usePanelSelectionGestures } from './use_panel_selection_gestures';

let mockDashboardApi: ReturnType<typeof initializeTrackPanel>['api'];

jest.mock('../../dashboard_api/use_dashboard_api', () => ({
  useDashboardApi: () => mockDashboardApi,
}));

// Ctrl is the selection modifier on every platform except macOS
jest.mock('@kbn/shared-ux-utility', () => ({
  ...jest.requireActual('@kbn/shared-ux-utility'),
  isMac: false,
}));

jest.mock('@kbn/grid-layout', () => ({
  startAutoScroll: jest.fn(),
  stopAutoScroll: jest.fn(),
  handleAutoscroll: jest.fn(),
}));

jest.mock('@kbn/core-chrome-layout-utils', () => ({
  getScrollContainer: () => document.documentElement,
  getScrollPosition: () => 0,
}));

const PANEL_IDS = ['panel1', 'panel2', 'panel3'] as const;

const createElement = (parent: HTMLElement, tagName = 'div', attributes = {}) => {
  const element = document.createElement(tagName);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
  parent.appendChild(element);
  return element;
};

const setBoundingRect = (
  element: HTMLElement,
  { left, top, right, bottom }: { left: number; top: number; right: number; bottom: number }
) => {
  element.getBoundingClientRect = () =>
    ({
      left,
      top,
      right,
      bottom,
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    } as DOMRect);
};

const click = (target: Element, { ctrlKey = false, clientX = 0, clientY = 0 } = {}) => {
  const init = { button: 0, ctrlKey, clientX, clientY };
  fireEvent.mouseDown(target, init);
  fireEvent.mouseUp(target, init);
  fireEvent.click(target, init);
};

describe('usePanelSelectionGestures', () => {
  let cleanupTrackPanel: () => void;
  let root: HTMLElement;
  let panels: Record<(typeof PANEL_IDS)[number], HTMLElement>;
  let panelContent: HTMLElement;
  let panelButton: HTMLElement;
  let outside: HTMLElement;
  let portal: HTMLElement;
  let input: HTMLInputElement;
  let onPanelContentClick: jest.Mock;
  let onPanelButtonClick: jest.Mock;

  const getSelection = () => mockDashboardApi.selectedPanelIds$.value;

  const renderGestures = ({ enabled = true } = {}) => {
    const layoutRef = { current: root } as React.RefObject<HTMLDivElement>;
    const panelRefs = {
      current: Object.fromEntries(
        Object.entries(panels).map(([id, element]) => [id, { current: element }])
      ),
    } as React.MutableRefObject<{ [panelId: string]: React.Ref<HTMLDivElement> }>;
    return renderHook(() => usePanelSelectionGestures({ layoutRef, panelRefs, enabled }));
  };

  beforeEach(() => {
    const children$ = new BehaviorSubject<DashboardChildren>(
      Object.fromEntries(
        PANEL_IDS.map((uuid) => [uuid, { uuid, type: 'testPanelType' } as DefaultEmbeddableApi])
      )
    );
    const { api, cleanup } = initializeTrackPanel(
      async () => undefined,
      children$,
      new BehaviorSubject<ViewMode>('edit')
    );
    mockDashboardApi = api;
    cleanupTrackPanel = cleanup;

    root = createElement(document.body);
    panels = {
      panel1: createElement(root),
      panel2: createElement(root),
      panel3: createElement(root),
    };
    setBoundingRect(panels.panel1, { left: 0, top: 0, right: 100, bottom: 100 });
    setBoundingRect(panels.panel2, { left: 200, top: 0, right: 300, bottom: 100 });
    setBoundingRect(panels.panel3, { left: 0, top: 200, right: 100, bottom: 300 });

    onPanelContentClick = jest.fn();
    panelContent = createElement(panels.panel1);
    panelContent.addEventListener('click', onPanelContentClick);

    onPanelButtonClick = jest.fn();
    panelButton = createElement(panels.panel1, 'button');
    panelButton.addEventListener('click', onPanelButtonClick);

    outside = createElement(document.body);
    portal = createElement(createElement(document.body, 'div', { 'data-euiportal': true }));
    input = createElement(document.body, 'input') as HTMLInputElement;
  });

  afterEach(() => {
    cleanupTrackPanel();
    document.body.innerHTML = '';
  });

  describe('without a selection', () => {
    it('lets a plain click reach the panel content without selecting anything', () => {
      renderGestures();

      click(panelContent);

      expect(onPanelContentClick).toHaveBeenCalledTimes(1);
      expect(getSelection()).toEqual([]);
    });

    it('toggles a panel on Ctrl+click and keeps the click from the panel content', () => {
      renderGestures();

      click(panelContent, { ctrlKey: true });

      expect(getSelection()).toEqual(['panel1']);
      expect(onPanelContentClick).not.toHaveBeenCalled();
    });

    it('leaves Ctrl+click on a button inside a panel to the button', () => {
      renderGestures();

      click(panelButton, { ctrlKey: true });

      expect(onPanelButtonClick).toHaveBeenCalledTimes(1);
      expect(getSelection()).toEqual([]);
    });

    it('does nothing when selection is disabled', () => {
      renderGestures({ enabled: false });

      click(panelContent, { ctrlKey: true });

      expect(getSelection()).toEqual([]);
      expect(onPanelContentClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('in selection mode', () => {
    beforeEach(() => {
      mockDashboardApi.togglePanelSelection('panel1');
    });

    it('toggles a panel on plain click and keeps the click from the panel content', () => {
      renderGestures();

      click(panels.panel2);
      expect(getSelection()).toEqual(['panel1', 'panel2']);

      click(panelContent);
      expect(getSelection()).toEqual(['panel2']);
      expect(onPanelContentClick).not.toHaveBeenCalled();
    });

    it('clears the selection on a click on the grid background', () => {
      renderGestures();

      click(root);

      expect(getSelection()).toEqual([]);
    });

    it('clears the selection on a click outside the grid', () => {
      renderGestures();

      click(outside);

      expect(getSelection()).toEqual([]);
    });

    it('keeps the selection on clicks inside portals and on the toolbar', () => {
      const toolbar = createElement(document.body, 'div', {
        'data-test-subj': 'dashboardSelectedPanelsToolbar',
      });
      renderGestures();

      click(portal);
      click(toolbar);

      expect(getSelection()).toEqual(['panel1']);
    });

    it('clears the selection on Escape', () => {
      renderGestures();

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(getSelection()).toEqual([]);
    });

    it('leaves Escape to a focused input', () => {
      renderGestures();

      fireEvent.keyDown(input, { key: 'Escape' });

      expect(getSelection()).toEqual(['panel1']);
    });
  });

  describe('rectangle selection', () => {
    it('adds only the panels the rectangle touches', () => {
      const { result } = renderGestures();

      // Spans panel1 and panel2 and misses panel3, so "the panel where the drag started" and "every panel" both fail
      fireEvent.mouseDown(panelContent, { button: 0, ctrlKey: true, clientX: 50, clientY: 50 });
      fireEvent.mouseMove(document, { clientX: 250, clientY: 60 });
      expect(result.current.marqueeRect).toEqual({ left: 50, top: 50, right: 250, bottom: 60 });

      fireEvent.mouseUp(document, { button: 0, ctrlKey: true, clientX: 250, clientY: 60 });

      expect(getSelection()).toEqual(['panel1', 'panel2']);
      expect(result.current.marqueeRect).toBeUndefined();
    });

    it('treats a movement within the threshold as a click', () => {
      const { result } = renderGestures();

      fireEvent.mouseDown(panels.panel2, { button: 0, ctrlKey: true, clientX: 250, clientY: 50 });
      fireEvent.mouseMove(document, { clientX: 252, clientY: 51 });
      // A rectangle would already be set here; mouseup clears it on both paths
      expect(result.current.marqueeRect).toBeUndefined();

      fireEvent.mouseUp(document, { button: 0, ctrlKey: true, clientX: 252, clientY: 51 });

      expect(getSelection()).toEqual(['panel2']);
    });
  });
});
