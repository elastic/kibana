/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_CLONE_ATTR } from '../../lib/constants';
import type { LayoutConfig } from '../../lib/layout/layout_config';
import type { ElementSession } from './element_registry';
import type { DragState } from './interaction_state';
import { startDragFromClone, findExistingClone, applyDragMove } from './drag_helpers';

const makeRect = (overrides: Partial<DOMRect> = {}): DOMRect => ({
  x: 0,
  y: 0,
  left: 100,
  top: 200,
  width: 80,
  height: 40,
  right: 180,
  bottom: 240,
  toJSON: jest.fn(),
  ...overrides,
});

const makeSession = (overrides: Partial<ElementSession> = {}): ElementSession => ({
  el: document.createElement('div'),
  clone: document.createElement('div'),
  dx: 0,
  dy: 0,
  dw: 0,
  dh: 0,
  originalTransform: '',
  originalRect: makeRect(),
  isDuplicate: false,
  ...overrides,
});

const makeLayoutConfig = (overrides: Partial<LayoutConfig> = {}): LayoutConfig => ({
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

describe('drag_helpers', () => {
  describe('startDragFromClone', () => {
    it('returns a DragState with correct start coordinates', () => {
      const session = makeSession({ dx: 10, dy: 20 });
      const result = startDragFromClone(session, 500, 300);

      expect(result.type).toBe('drag');
      expect(result.startX).toBe(500);
      expect(result.startY).toBe(300);
      expect(result.baseOffsetX).toBe(10);
      expect(result.baseOffsetY).toBe(20);
    });

    it('disables pointer events on the clone', () => {
      const session = makeSession();
      startDragFromClone(session, 0, 0);

      expect(session.clone!.style.pointerEvents).toBe('none');
    });

    it('sets will-change on the clone for performance', () => {
      const session = makeSession();
      startDragFromClone(session, 0, 0);

      expect(session.clone!.style.willChange).toBe('transform');
    });

    it('uses the session originalRect', () => {
      const rect = makeRect({ left: 50, top: 60 });
      const session = makeSession({ originalRect: rect });
      const result = startDragFromClone(session, 0, 0);

      expect(result.originalRect).toBe(rect);
    });
  });

  describe('findExistingClone', () => {
    it('returns null for elements without the clone attribute', () => {
      const el = document.createElement('div');
      const registry = { getByClone: jest.fn() } as any;

      expect(findExistingClone(el, registry)).toBeNull();
      expect(registry.getByClone).not.toHaveBeenCalled();
    });

    it('returns the session when the element is a known clone', () => {
      const el = document.createElement('div');
      el.setAttribute(DEVTOOL_CLONE_ATTR, 'true');
      const session = makeSession();
      const registry = { getByClone: jest.fn().mockReturnValue(session) } as any;

      expect(findExistingClone(el, registry)).toBe(session);
    });

    it('returns null when the clone is not tracked in the registry', () => {
      const el = document.createElement('div');
      el.setAttribute(DEVTOOL_CLONE_ATTR, 'true');
      const registry = { getByClone: jest.fn().mockReturnValue(undefined) } as any;

      expect(findExistingClone(el, registry)).toBeNull();
    });
  });

  describe('applyDragMove', () => {
    const makeState = (overrides: Partial<DragState> = {}): DragState => ({
      type: 'drag',
      el: document.createElement('div'),
      clone: document.createElement('div'),
      startX: 100,
      startY: 200,
      baseOffsetX: 0,
      baseOffsetY: 0,
      originalRect: makeRect(),
      ...overrides,
    });

    it('applies translate based on pointer delta', () => {
      const state = makeState({ startX: 100, startY: 200 });
      const session = makeSession({ el: state.el, dx: 0, dy: 0, dw: 0, dh: 0 });
      const registry = { get: jest.fn().mockReturnValue(session) };

      applyDragMove(state, 150, 250, true, registry, {
        isLayoutVisible: false,
        layoutConfig: makeLayoutConfig(),
        toolbarHeight: 0,
      });

      // dx = baseOffsetX(0) + mouseDx(50) = 50
      // dy = baseOffsetY(0) + mouseDy(50) = 50
      expect(session.dx).toBe(50);
      expect(session.dy).toBe(50);
      expect(state.clone.style.transform).toContain('translate');
    });

    it('accumulates base offset from prior gestures', () => {
      const state = makeState({ startX: 100, startY: 200, baseOffsetX: 20, baseOffsetY: 30 });
      const session = makeSession({ el: state.el, dx: 20, dy: 30, dw: 0, dh: 0 });
      const registry = { get: jest.fn().mockReturnValue(session) };

      applyDragMove(state, 110, 210, true, registry, {
        isLayoutVisible: false,
        layoutConfig: makeLayoutConfig(),
        toolbarHeight: 0,
      });

      // dx = 20 + 10 = 30, dy = 30 + 10 = 40
      expect(session.dx).toBe(30);
      expect(session.dy).toBe(40);
    });

    it('applies snap-to-grid when shift is not held and layout is visible', () => {
      const state = makeState({
        startX: 0,
        startY: 0,
        baseOffsetX: 0,
        baseOffsetY: 0,
        originalRect: makeRect({ left: 0, top: 0 }),
      });
      const session = makeSession({ el: state.el, dx: 0, dy: 0, dw: 0, dh: 0 });
      const registry = { get: jest.fn().mockReturnValue(session) };
      const config = makeLayoutConfig({ cellSize: 10 });

      applyDragMove(state, 13, 17, false, registry, {
        isLayoutVisible: true,
        layoutConfig: config,
        toolbarHeight: 0,
      });

      // snapToGrid rounds to nearest cellSize: 13→10, 17→20
      expect(session.dx).toBe(10);
      expect(session.dy).toBe(20);
    });

    it('skips snapping when shift key is held', () => {
      const state = makeState({
        startX: 0,
        startY: 0,
        baseOffsetX: 0,
        baseOffsetY: 0,
        originalRect: makeRect({ left: 0, top: 0 }),
      });
      const session = makeSession({ el: state.el, dx: 0, dy: 0, dw: 0, dh: 0 });
      const registry = { get: jest.fn().mockReturnValue(session) };
      const config = makeLayoutConfig({ cellSize: 10 });

      applyDragMove(state, 13, 17, true, registry, {
        isLayoutVisible: true,
        layoutConfig: config,
        toolbarHeight: 0,
      });

      // No snapping — raw deltas
      expect(session.dx).toBe(13);
      expect(session.dy).toBe(17);
    });

    it('skips snapping when layout is not visible', () => {
      const state = makeState({
        startX: 0,
        startY: 0,
        baseOffsetX: 0,
        baseOffsetY: 0,
        originalRect: makeRect({ left: 0, top: 0 }),
      });
      const session = makeSession({ el: state.el, dx: 0, dy: 0, dw: 0, dh: 0 });
      const registry = { get: jest.fn().mockReturnValue(session) };
      const config = makeLayoutConfig({ cellSize: 10 });

      applyDragMove(state, 13, 17, false, registry, {
        isLayoutVisible: false,
        layoutConfig: config,
        toolbarHeight: 0,
      });

      expect(session.dx).toBe(13);
      expect(session.dy).toBe(17);
    });

    it('accounts for scale from prior resize (dw/dh)', () => {
      const rect = makeRect({ width: 100, height: 50 });
      const state = makeState({
        startX: 0,
        startY: 0,
        baseOffsetX: 0,
        baseOffsetY: 0,
        originalRect: rect,
      });
      // Session has a prior resize of +20 width, +10 height
      const session = makeSession({ el: state.el, dx: 0, dy: 0, dw: 20, dh: 10 });
      const registry = { get: jest.fn().mockReturnValue(session) };

      applyDragMove(state, 30, 40, true, registry, {
        isLayoutVisible: false,
        layoutConfig: makeLayoutConfig(),
        toolbarHeight: 0,
      });

      // scaleX = (100+20)/100 = 1.2, scaleY = (50+10)/50 = 1.2
      expect(state.clone.style.transform).toContain('scale');
      expect(session.dx).toBe(30);
      expect(session.dy).toBe(40);
    });

    it('handles missing session gracefully (no registry entry)', () => {
      const state = makeState({ startX: 0, startY: 0 });
      const registry = { get: jest.fn().mockReturnValue(undefined) };

      // Should not throw
      applyDragMove(state, 10, 20, true, registry, {
        isLayoutVisible: false,
        layoutConfig: makeLayoutConfig(),
        toolbarHeight: 0,
      });

      // Transform still applied with scale 1
      expect(state.clone.style.transform).toBeTruthy();
    });
  });
});
