/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';
import type { ElementSession } from '../dom/element_registry';
import { ElementRegistry } from '../dom/element_registry';
import type { LayoutConfig } from '../layout/layout_config';
import type { ElementSessionSnapshot } from '../history/transaction';
import type { InteractionMachineOptions } from '../../hooks/use_interaction_machine';
import type { ExportedState } from '../history/serialization/session_io';
import './mocks';

export const makeRect = (
  xOrOverrides: number | Partial<DOMRect> = {},
  y = 0,
  w = 100,
  h = 50
): DOMRect => {
  if (typeof xOrOverrides === 'number') {
    const x = xOrOverrides;
    return {
      x,
      y,
      left: x,
      top: y,
      width: w,
      height: h,
      right: x + w,
      bottom: y + h,
      toJSON: jest.fn(),
    };
  }
  return {
    x: 0,
    y: 0,
    left: 100,
    top: 200,
    width: 80,
    height: 40,
    right: 180,
    bottom: 240,
    toJSON: jest.fn(),
    ...xOrOverrides,
  };
};

export const makeSession = (overrides: Partial<ElementSession> = {}): ElementSession => ({
  el: document.createElement('div'),
  dx: 0,
  dy: 0,
  dw: 0,
  dh: 0,
  originalRect: new DOMRect(0, 0, 100, 50),
  isDuplicate: false,
  styleEdits: [],
  textEdits: [],
  mediaEdits: [],
  ...overrides,
});

export const makeLayoutConfig = (overrides: Partial<LayoutConfig> = {}): LayoutConfig => ({
  layoutType: 'grid',
  count: 12,
  alignType: 'stretch',
  rowAlignType: 'stretch',
  cellSize: 8,
  width: 0,
  height: 0,
  gutterSize: 16,
  marginSize: 16,
  color: '#FF00FF1A',
  ...overrides,
});

export const makePointerEvent = (
  type: string,
  props: Partial<PointerEventInit> = {}
): PointerEvent => {
  return new PointerEvent(type, {
    clientX: 0,
    clientY: 0,
    bubbles: true,
    ...props,
  });
};

export const renderIntoContainer = (element: ReactElement): HTMLElement => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(element);
  });
  return container;
};

export const makeSnapshot = (session: ElementSession, parent?: Node): ElementSessionSnapshot => ({
  el: session.el,
  dx: session.dx,
  dy: session.dy,
  dw: session.dw,
  dh: session.dh,
  originalRect: session.originalRect,
  isDuplicate: session.isDuplicate,
  referenceEl: session.referenceEl,
  liveReactElement: session.liveReactElement,
  componentState: session.componentState,
  parentNode: parent ?? session.el.parentNode ?? document.body,
  nextSibling: session.el.nextSibling,
  styleEdits: [...session.styleEdits],
  textEdits: [...session.textEdits],
  mediaEdits: [...session.mediaEdits],
  cleanup: session.cleanup,
});

export const makeInteractionOptions = (
  overrides: Partial<InteractionMachineOptions> = {}
): InteractionMachineOptions => {
  const registry = { current: new ElementRegistry() };
  return {
    registry,
    hoverTargetRef: { current: null },
    stickyHover: { current: null },
    roundedTargets: { current: new WeakSet() },
    rafId: { current: 0 },
    effects: {
      setCursor: jest.fn(),
      updateHoverTarget: jest.fn(),
      notifyCount: jest.fn(),
    },
    isInsideHoverLock: () => false,
    cloneZIndex: 1000,
    ...overrides,
  };
};

export const makeMinimalExport = (
  overrides: Partial<ExportedState> = {},
  sessionOverrides: Record<string, unknown> = {}
): ExportedState => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  pageUrl: 'http://localhost:5601/app/test',
  viewport: { width: 1280, height: 720 },
  sessions: [
    {
      dx: 10,
      dy: 20,
      dw: 0,
      dh: 0,
      originalRect: { x: 100, y: 200, width: 80, height: 40 },
      isDuplicate: true,
      styleEdits: [],
      textEdits: [],
      mediaEdits: [],
      outerHTML:
        '<div style="position:fixed;left:100px;top:200px;width:80px;height:40px;">test</div>',
      inlineStyles: 'position: fixed; left: 100px; top: 200px; width: 80px; height: 40px;',
      ...sessionOverrides,
    },
  ],
  ...overrides,
});

export const createScrollContainer = (scrollLeft = 0, scrollTop = 0): HTMLDivElement => {
  const el = document.createElement('div');
  el.id = APP_MAIN_SCROLL_CONTAINER_ID;
  Object.defineProperty(el, 'scrollLeft', { value: scrollLeft, writable: true });
  Object.defineProperty(el, 'scrollTop', { value: scrollTop, writable: true });
  document.body.appendChild(el);
  return el;
};
