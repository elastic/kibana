/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_MANAGED_ATTR } from '../lib/constants';
import type { DragState } from './interaction_state';
import type { ElementRegistry } from './element_registry';
import { startDragFromSession, findManagedSession, applyDragMove } from './drag_helpers';
import { makeRect, makeSession, makeLayoutConfig } from '../lib/tests/helpers';

describe('dragHelpers', () => {
  describe('startDragFromSession', () => {
    it('should return a DragState with correct start coordinates', () => {
      const session = makeSession({ dx: 10, dy: 20 });
      const result = startDragFromSession(session, 500, 300);

      expect(result.type).toBe('drag');
      expect(result.startX).toBe(500);
      expect(result.startY).toBe(300);
      expect(result.baseOffsetX).toBe(10);
      expect(result.baseOffsetY).toBe(20);
    });
  });

  describe('findManagedSession', () => {
    it('should return null for unmanaged elements', () => {
      const el = document.createElement('div');
      const registry = { get: jest.fn() } as unknown as ElementRegistry;

      expect(findManagedSession(el, registry)).toBeNull();
      expect(registry.get).not.toHaveBeenCalled();
    });

    it('should return the session when the element is managed', () => {
      const el = document.createElement('div');
      el.setAttribute(DEVTOOL_MANAGED_ATTR, '');
      const session = makeSession();
      const registry = { get: jest.fn().mockReturnValue(session) } as unknown as ElementRegistry;

      expect(findManagedSession(el, registry)).toBe(session);
    });

    it('should return null when the element is not tracked in the registry', () => {
      const el = document.createElement('div');
      el.setAttribute(DEVTOOL_MANAGED_ATTR, '');
      const registry = { get: jest.fn().mockReturnValue(undefined) } as unknown as ElementRegistry;

      expect(findManagedSession(el, registry)).toBeNull();
    });
  });

  describe('applyDragMove', () => {
    const makeState = (overrides: Partial<DragState> = {}): DragState => {
      const session = makeSession();
      return {
        type: 'drag',
        session,
        startX: 100,
        startY: 200,
        baseOffsetX: 0,
        baseOffsetY: 0,
        ...overrides,
      };
    };

    it('should apply translate based on pointer delta', () => {
      const session = makeSession();
      const state = makeState({ session, startX: 100, startY: 200 });

      applyDragMove(state, 150, 250, true, {
        isLayoutVisible: false,
        layoutConfig: makeLayoutConfig(),
      });

      // dx = baseOffsetX(0) + mouseDx(50) = 50
      // dy = baseOffsetY(0) + mouseDy(50) = 50
      expect(session.dx).toBe(50);
      expect(session.dy).toBe(50);
      expect(session.el.style.transform).toContain('translate');
    });

    it('should accumulate base offset from prior gestures', () => {
      const session = makeSession({ dx: 20, dy: 30 });
      const state = makeState({
        session,
        startX: 100,
        startY: 200,
        baseOffsetX: 20,
        baseOffsetY: 30,
      });

      applyDragMove(state, 110, 210, true, {
        isLayoutVisible: false,
        layoutConfig: makeLayoutConfig(),
      });

      // dx = 20 + 10 = 30, dy = 30 + 10 = 40
      expect(session.dx).toBe(30);
      expect(session.dy).toBe(40);
    });

    it('should apply snap-to-grid when shift is not held and layout is visible', () => {
      const session = makeSession({ originalRect: makeRect({ left: 0, top: 0 }) });
      const state = makeState({ session, startX: 0, startY: 0 });
      const config = makeLayoutConfig({ cellSize: 10 });

      applyDragMove(state, 13, 17, false, {
        isLayoutVisible: true,
        layoutConfig: config,
      });

      // snapToGrid rounds to nearest cellSize: 13→10, 17→20
      expect(session.dx).toBe(10);
      expect(session.dy).toBe(20);
    });

    it('should account for scale from prior resize (dw/dh)', () => {
      const rect = makeRect({ width: 100, height: 50 });
      // Session has a prior resize of +20 width, +10 height
      const session = makeSession({ dw: 20, dh: 10, originalRect: rect });
      const state = makeState({ session, startX: 0, startY: 0 });

      applyDragMove(state, 30, 40, true, {
        isLayoutVisible: false,
        layoutConfig: makeLayoutConfig(),
      });

      // scaleX = (100+20)/100 = 1.2, scaleY = (50+10)/50 = 1.2
      expect(session.el.style.transform).toContain('scale');
      expect(session.dx).toBe(30);
      expect(session.dy).toBe(40);
    });
  });
});
