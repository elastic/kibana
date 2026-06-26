/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElementRegistry } from '../../../edit_engine/element_registry';
import { exportState, importState } from './session_io';
import { createScrollContainer, makeMinimalExport } from '../../tests/helpers';
import '../../tests/mocks';

// Stub heavy dependencies that aren't relevant for scroll-offset tests.
jest.mock('../../../components/edit/library/insert_element', () => ({
  renderEuiComponentLive: jest.fn(),
}));
jest.mock('../../../components/edit/library/library_entries', () => ({
  EUI_LIBRARY: [],
}));
jest.mock('../../../components/edit/library/serializable_state', () => ({
  readStateAttributes: () => ({}),
}));
jest.mock('../../../components/edit/library/eui_icon_cache', () => ({
  replaceIconContent: jest.fn(),
  applySourceAttribute: jest.fn(),
}));
jest.mock('../../dom/get_page_color_mode', () => ({
  getPageColorScheme: () => ({ colorMode: 'light', forcedColors: false }),
}));
jest.mock('../../dom/color_token_lookup', () => ({
  resolveColorTokensDeep: jest.fn(),
}));
jest.mock('../../../edit_engine/remap_emotion_classes', () => ({
  buildEmotionClassMap: () => new Map(),
  remapEmotionClasses: jest.fn(),
}));

describe('session_io scroll offset', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('exportState', () => {
    it('should capture scroll position from the main scroll container', () => {
      createScrollContainer(50, 300);
      const registry = new ElementRegistry();

      const exported = exportState(registry);

      expect(exported.scroll).toEqual({ x: 50, y: 300 });
    });

    it('should default to zero when the scroll container is absent', () => {
      const registry = new ElementRegistry();

      const exported = exportState(registry);

      expect(exported.scroll).toEqual({ x: 0, y: 0 });
    });
  });

  describe('importState scroll handling', () => {
    it('should preserve duplicate positions when scroll has not changed', async () => {
      createScrollContainer(0, 300);
      const registry = new ElementRegistry();

      const state = makeMinimalExport({ scroll: { x: 0, y: 300 } });
      await importState(state, registry);

      const session = [...registry.values()][0];
      expect(session.originalRect.x).toBe(100);
      expect(session.originalRect.y).toBe(200);
      expect(session.el.style.left).toBe('100px');
      expect(session.el.style.top).toBe('200px');
    });

    it('should shift duplicate positions by scroll delta when user scrolled down', async () => {
      // Exported at scrollTop=100, importing at scrollTop=400 → delta=300
      createScrollContainer(0, 400);
      const registry = new ElementRegistry();

      const state = makeMinimalExport({ scroll: { x: 0, y: 100 } });
      await importState(state, registry);

      const session = [...registry.values()][0];
      expect(session.originalRect.x).toBe(100);
      expect(session.originalRect.y).toBe(-100); // 200 - 300
      expect(session.el.style.left).toBe('100px');
      expect(session.el.style.top).toBe('-100px');
    });

    it('should shift duplicate positions by scroll delta when user scrolled up', async () => {
      createScrollContainer(0, 200);
      const registry = new ElementRegistry();

      const state = makeMinimalExport({ scroll: { x: 0, y: 500 } });
      await importState(state, registry);

      const session = [...registry.values()][0];
      expect(session.originalRect.y).toBe(500); // 200 - (200-500) = 500
      expect(session.el.style.top).toBe('500px');
    });

    it('should adjust both x and y for duplicates with horizontal and vertical scroll', async () => {
      createScrollContainer(60, 120);
      const registry = new ElementRegistry();

      const state = makeMinimalExport({ scroll: { x: 10, y: 20 } });
      await importState(state, registry);

      const session = [...registry.values()][0];
      expect(session.originalRect.x).toBe(50); // 100 - 50
      expect(session.originalRect.y).toBe(100); // 200 - 100
    });

    it('should fall back to zero scroll for exports without scroll field', async () => {
      createScrollContainer(0, 200);
      const registry = new ElementRegistry();

      const state = makeMinimalExport();
      delete (state as unknown as Record<string, unknown>).scroll;
      await importState(state, registry);

      const session = [...registry.values()][0];
      expect(session.originalRect.y).toBe(0); // 200 - 200
    });

    it('should fall back to zero when no scroll container exists at import', async () => {
      const registry = new ElementRegistry();

      const state = makeMinimalExport({ scroll: { x: 0, y: 300 } });
      await importState(state, registry);

      const session = [...registry.values()][0];
      expect(session.originalRect.y).toBe(500); // 200 - (0-300) = 500
    });

    it('should preserve width and height in originalRect unchanged', async () => {
      createScrollContainer(0, 500);
      const registry = new ElementRegistry();

      const state = makeMinimalExport({ scroll: { x: 0, y: 100 } });
      await importState(state, registry);

      const session = [...registry.values()][0];
      expect(session.originalRect.width).toBe(80);
      expect(session.originalRect.height).toBe(40);
    });

    it('should preserve dx/dy transform deltas unchanged', async () => {
      createScrollContainer(0, 500);
      const registry = new ElementRegistry();

      const state = makeMinimalExport({ scroll: { x: 0, y: 100 } });
      await importState(state, registry);

      const session = [...registry.values()][0];
      expect(session.dx).toBe(10);
      expect(session.dy).toBe(20);
    });

    it('should round duplicate positions to whole pixels via roundRect', async () => {
      createScrollContainer(0.136, 456.7);
      const registry = new ElementRegistry();

      const state = makeMinimalExport({ scroll: { x: 0, y: 500 } });
      await importState(state, registry);

      const session = [...registry.values()][0];
      // scrollDy = 456.7 - 500 = -43.3 → raw y = 200+43.3 = 243.3, rounded = 243
      // scrollDx = 0.136 - 0 = 0.136 → raw x = 100-0.136 = 99.864, rounded = 100
      expect(session.originalRect.x).toBe(100);
      expect(session.originalRect.y).toBe(243);
      expect(session.el.style.left).toBe('100px');
      expect(session.el.style.top).toBe('243px');
    });

    it('should keep root width auto on import for no-wrap text edits', async () => {
      createScrollContainer(0, 0);
      const registry = new ElementRegistry();

      const state = makeMinimalExport(
        { scroll: { x: 0, y: 0 } },
        {
          outerHTML:
            '<span data-devtool-managed=""><span class="txt" style="white-space:nowrap">Saved</span></span>',
          inlineStyles: 'position: fixed; left: 100px; top: 200px; width: 80px; height: 40px;',
          textEdits: [
            {
              parentPath: { selector: 'body', fingerprint: '' },
              parentRelativeSelector: '.txt',
              childIndex: 0,
              original: 'Saved',
              current: 'Saved aaaaaaaaa',
            },
          ],
        }
      );

      await importState(state, registry);

      const session = [...registry.values()][0];
      expect(session.el.style.getPropertyValue('width')).toBe('');
      expect(session.el.style.getPropertyValue('height')).toBe('');
      expect(session.el.textContent).toContain('Saved aaaaaaaaa');
    });

    it('should keep root auto dimensions on import for no-wrap text style-only edits', async () => {
      createScrollContainer(0, 0);
      const registry = new ElementRegistry();

      const state = makeMinimalExport(
        { scroll: { x: 0, y: 0 } },
        {
          outerHTML:
            '<span data-devtool-managed=""><span class="txt" style="white-space:nowrap">Saved</span></span>',
          inlineStyles: 'position: fixed; left: 100px; top: 200px; width: 80px; height: 40px;',
          textEdits: [],
          styleEdits: [
            {
              targetPath: { selector: 'body', fingerprint: '' },
              relativeSelector: '.txt',
              property: 'font-size',
              original: '',
              originalPriority: '',
              current: '20px',
              currentPriority: 'important',
            },
            {
              targetPath: { selector: 'body', fingerprint: '' },
              relativeSelector: '',
              property: 'width',
              original: '80px',
              originalPriority: 'important',
              current: '',
              currentPriority: '',
            },
            {
              targetPath: { selector: 'body', fingerprint: '' },
              relativeSelector: '',
              property: 'height',
              original: '40px',
              originalPriority: 'important',
              current: '',
              currentPriority: '',
            },
          ],
        }
      );

      await importState(state, registry);

      const session = [...registry.values()][0];
      expect(session.el.style.getPropertyValue('width')).toBe('');
      expect(session.el.style.getPropertyValue('height')).toBe('');
      const txt = session.el.querySelector('.txt') as HTMLElement;
      expect(txt.style.getPropertyValue('font-size')).toBe('20px');
    });
  });
});
