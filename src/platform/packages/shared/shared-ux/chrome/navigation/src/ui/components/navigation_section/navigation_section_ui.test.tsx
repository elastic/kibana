/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

import { serializeNavNode } from './navigation_section_ui';

describe('Navigation Section UI: serializeNavNode', () => {
  describe('Panel openers with links', () => {
    test('should render as accordions when side nav is collapsed', () => {
      const panelOpenerNavNodeWithLink: ChromeProjectNavigationNode = {
        id: 'test-with-link',
        title: 'Panel Opener With Link',
        path: 'test-path',
        renderAs: 'panelOpener',
        href: '/some-link',
        children: [
          {
            id: 'child',
            title: 'Child Node',
            path: 'child-path',
          },
        ],
      };

      const serialized = serializeNavNode(panelOpenerNavNodeWithLink, {
        isSideNavCollapsed: true,
        treeDepth: 0,
      });

      expect(serialized.renderAs).toBe('accordion');
    });

    test('should maintain original renderAs when side nav is not collapsed', () => {
      const panelOpenerNavNodeWithLink: ChromeProjectNavigationNode = {
        id: 'test-with-link',
        title: 'Panel Opener With Link',
        path: 'test-path',
        renderAs: 'panelOpener',
        href: '/some-link',
      };

      const serialized = serializeNavNode(panelOpenerNavNodeWithLink, {
        isSideNavCollapsed: false,
        treeDepth: 0,
      });

      expect(serialized.renderAs).toBe('panelOpener');
    });
  });

  describe('Panel openers without links', () => {
    test('should render as accordions when side nav is collapsed', () => {
      const panelOpenerNavNodeWithoutLink: ChromeProjectNavigationNode = {
        id: 'test-no-link',
        title: 'Panel Opener Without Link',
        path: 'test-no-link-path',
        renderAs: 'panelOpener',
        children: [
          {
            id: 'child',
            title: 'Child Node',
            path: 'child-path',
          },
        ],
      };

      const serialized = serializeNavNode(panelOpenerNavNodeWithoutLink, {
        isSideNavCollapsed: true,
        treeDepth: 0,
      });

      expect(serialized.renderAs).toBe('accordion');
    });

    test('should maintain original renderAs when side nav is not collapsed', () => {
      const panelOpenerNavNodeWithoutLink: ChromeProjectNavigationNode = {
        id: 'test-no-link',
        title: 'Panel Opener Without Link',
        path: 'test-no-link-path',
        renderAs: 'panelOpener',
      };

      const serialized = serializeNavNode(panelOpenerNavNodeWithoutLink, {
        isSideNavCollapsed: false,
        treeDepth: 0,
      });

      expect(serialized.renderAs).toBe('panelOpener');
    });
  });
});
