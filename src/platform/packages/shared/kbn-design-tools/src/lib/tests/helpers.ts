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
import type { ElementSession } from '../../edit_engine/element_registry';
import { ElementRegistry } from '../../edit_engine/element_registry';
import type { LayoutConfig } from '../layout/layout_config';
import type { ElementSessionSnapshot } from '../history/transaction';
import type { InteractionMachineOptions } from '../../edit_engine/use_interaction_machine';
import type { ExportedState } from '../history/serialization/session_io';
import './mocks';

/** Creates a mock DOMRect from positional arguments or a partial override. */
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

/**
 * Creates a mock ElementSession with sensible defaults.
 *
 * @param overrides - Partial session fields to override.
 * @returns A complete {@link ElementSession}.
 */
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

/**
 * Creates a mock LayoutConfig with sensible defaults.
 *
 * @param overrides - Partial config fields to override.
 * @returns A complete {@link LayoutConfig}.
 */
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

/** Creates a synthetic PointerEvent for testing. */
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

/**
 * Renders a React element synchronously into a detached container.
 *
 * @param element - The React element to render.
 * @returns The container DOM element.
 */
export const renderIntoContainer = (element: ReactElement): HTMLElement => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(element);
  });
  return container;
};

/**
 * Creates a mock ElementSessionSnapshot from a session.
 *
 * @param session - The session to snapshot.
 * @param parent - Optional parent node for the snapshot.
 * @returns A complete {@link ElementSessionSnapshot}.
 */
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
  parentNode: parent ?? session.el.parentNode ?? document.body,
  nextSibling: session.el.nextSibling,
  styleEdits: [...session.styleEdits],
  textEdits: [...session.textEdits],
  mediaEdits: [...session.mediaEdits],
  cleanup: session.cleanup,
});

/** Creates mock InteractionMachineOptions with jest.fn() callbacks. */
/** Creates mock InteractionMachineOptions with jest.fn() callbacks. */
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

/** Creates a minimal ExportedState fixture for serialization tests. */
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

/** Creates a mock scroll container element attached to the document. */
export const createScrollContainer = (scrollLeft = 0, scrollTop = 0): HTMLDivElement => {
  const el = document.createElement('div');
  el.id = APP_MAIN_SCROLL_CONTAINER_ID;
  Object.defineProperty(el, 'scrollLeft', { value: scrollLeft, writable: true });
  Object.defineProperty(el, 'scrollTop', { value: scrollTop, writable: true });
  document.body.appendChild(el);
  return el;
};
