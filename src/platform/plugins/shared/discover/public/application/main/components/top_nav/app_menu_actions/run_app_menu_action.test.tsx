/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { discoverServiceMock } from '../../../../../__mocks__/services';
import { runAppMenuAction, enhanceAppMenuItemWithRunAction } from './run_app_menu_action';
import type { DiscoverAppMenuItemType, DiscoverAppMenuRunActionParams } from '@kbn/discover-utils';

describe('run app menu actions', () => {
  describe('runAppMenuAction', () => {
    it('should call the run function with correct params', async () => {
      const mockRun = jest.fn();
      const appMenuItem: DiscoverAppMenuItemType = {
        id: 'action-1',
        order: 1,
        label: 'Action 1',
        testId: 'action-1',
        iconType: 'share',
        run: mockRun,
      };

      const anchorElement = document.createElement('div');

      await runAppMenuAction({
        appMenuItem,
        anchorElement,
        services: discoverServiceMock,
      });

      expect(mockRun).toHaveBeenCalledTimes(1);
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerElement: anchorElement,
          context: expect.objectContaining({
            onFinishAction: expect.any(Function),
          }),
        })
      );
    });

    it('should not render anything if run returns void', async () => {
      const mockRun = jest.fn();
      const appMenuItem: AppMenuItemType = {
        id: 'action-1',
        order: 1,
        label: 'Action 1',
        testId: 'action-1',
        iconType: 'share',
        run: mockRun,
      };

      const anchorElement = document.createElement('div');

      await runAppMenuAction({
        appMenuItem,
        anchorElement,
        services: discoverServiceMock,
      });

      expect(mockRun).toHaveBeenCalled();
      expect(document.body.querySelectorAll('div').length).toBe(0);
    });

    it('should call onFinishAction to cleanup', async () => {
      let capturedParams: DiscoverAppMenuRunActionParams | undefined;

      const mockRun = jest.fn((params) => {
        capturedParams = params;
        return <div data-test-subj="test-content">Custom Content</div>;
      });

      const appMenuItem: DiscoverAppMenuItemType = {
        id: 'action-1',
        order: 1,
        label: 'Action 1',
        testId: 'action-1',
        iconType: 'share',
        run: mockRun,
      };

      const anchorElement = document.createElement('div');
      document.body.appendChild(anchorElement);
      const focusSpy = jest.spyOn(anchorElement, 'focus');

      await runAppMenuAction({
        appMenuItem,
        anchorElement,
        services: discoverServiceMock,
      });

      expect(mockRun).toHaveBeenCalled();
      expect(capturedParams).toBeDefined();
      expect(capturedParams?.context.onFinishAction).toBeDefined();

      const containers = document.body.querySelectorAll('div');
      expect(containers.length).toBeGreaterThan(0);

      const onFinishAction = capturedParams?.context?.onFinishAction;
      onFinishAction!();

      expect(document.body.querySelectorAll('div').length).toBe(1);
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('enhanceAppMenuItemWithRunAction', () => {
    it('should wrap the run function', () => {
      const mockRun = jest.fn();
      const appMenuItem: DiscoverAppMenuItemType = {
        id: 'action-1',
        order: 1,
        label: 'Action 1',
        testId: 'action-1',
        iconType: 'share',
        run: mockRun,
      };

      const enhanced = enhanceAppMenuItemWithRunAction({
        appMenuItem,
        services: discoverServiceMock,
      });

      expect(enhanced.run).toBeDefined();
      expect(enhanced.run).not.toBe(mockRun);
    });

    it('should call runAppMenuAction when wrapper is invoked', async () => {
      const mockRun = jest.fn();
      const appMenuItem: DiscoverAppMenuItemType = {
        id: 'action-1',
        order: 1,
        label: 'Action 1',
        testId: 'action-1',
        iconType: 'share',
        run: mockRun,
      };

      const enhanced = enhanceAppMenuItemWithRunAction({
        appMenuItem,
        services: discoverServiceMock,
      });

      const triggerElement = document.createElement('div');
      enhanced.run?.({ triggerElement, context: { onFinishAction: jest.fn() } });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockRun).toHaveBeenCalled();
    });

    it('should recursively enhance nested items', () => {
      const mockNestedRun = jest.fn();
      const appMenuItem: DiscoverAppMenuItemType = {
        id: 'parent',
        order: 1,
        label: 'Parent',
        iconType: 'folder',
        items: [
          {
            id: 'child',
            order: 1,
            label: 'Child',
            iconType: 'document',
            run: mockNestedRun,
          },
        ],
      };

      const enhanced = enhanceAppMenuItemWithRunAction({
        appMenuItem,
        services: discoverServiceMock,
      });

      expect(enhanced.items).toBeDefined();
      expect(enhanced.items?.[0]).toBeDefined();
      expect(enhanced.items?.[0].run).toBeDefined();
      expect(enhanced.items?.[0].run).not.toBe(mockNestedRun);
    });

    it('should preserve all properties', () => {
      const appMenuItem: DiscoverAppMenuItemType = {
        id: 'action-1',
        order: 5,
        label: 'Action 1',
        iconType: 'share',
        testId: 'my-test-id',
        run: jest.fn(),
      };

      const enhanced = enhanceAppMenuItemWithRunAction({
        appMenuItem,
        services: discoverServiceMock,
      });

      expect(enhanced.id).toBe('action-1');
      expect(enhanced.order).toBe(5);
      expect(enhanced.label).toBe('Action 1');
      expect(enhanced.iconType).toBe('share');
      expect(enhanced.testId).toBe('my-test-id');
    });

    it('should return undefined run when item has no run', () => {
      const appMenuItem: DiscoverAppMenuItemType = {
        id: 'action-1',
        order: 1,
        label: 'Action 1',
        iconType: 'share',
        items: [],
      };

      const enhanced = enhanceAppMenuItemWithRunAction({
        appMenuItem,
        services: discoverServiceMock,
      });

      expect(enhanced.run).toBeUndefined();
    });
  });
});
