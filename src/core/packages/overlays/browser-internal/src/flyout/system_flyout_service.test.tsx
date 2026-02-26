/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockReactDomRender, mockReactDomUnmount } from '../overlay.test.mocks';
import { render } from '@testing-library/react';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { SystemFlyoutService } from './system_flyout_service';
import type { SystemFlyoutRef } from './system_flyout_ref';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlaySystemFlyoutStart } from '@kbn/core-overlays-browser';
import React from 'react';

interface FlyoutManagerEvent {
  type: 'CLOSE_SESSION';
  session: { mainFlyoutId: string; childFlyoutId: string | null };
}

const eventListeners = new Set<(event: FlyoutManagerEvent) => void>();
const mockSubscribeToEvents = jest.fn((listener: (event: FlyoutManagerEvent) => void) => {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
});

const emitEvent = (event: FlyoutManagerEvent) => {
  eventListeners.forEach((listener) => listener(event));
};

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    getFlyoutManagerStore: jest.fn(() => ({ subscribeToEvents: mockSubscribeToEvents })),
  };
});

const analyticsMock = analyticsServiceMock.createAnalyticsServiceStart();
const i18nMock = i18nServiceMock.createStartContract();
const themeMock = themeServiceMock.createStartContract();
const userProfileMock = userProfileServiceMock.createStart();

beforeEach(() => {
  mockReactDomRender.mockClear();
  mockReactDomUnmount.mockClear();
  mockSubscribeToEvents.mockClear();
  eventListeners.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('SystemFlyoutService', () => {
  let systemFlyouts: OverlaySystemFlyoutStart;
  let service: SystemFlyoutService;
  let targetDomElement: HTMLElement;
  let skipCleanup = false;

  beforeEach(() => {
    skipCleanup = false;
    service = new SystemFlyoutService();
    targetDomElement = document.createElement('div');
    systemFlyouts = service.start({
      analytics: analyticsMock,
      i18n: i18nMock,
      theme: themeMock,
      userProfile: userProfileMock,
      targetDomElement,
    });
  });

  afterEach(() => {
    if (!skipCleanup) {
      service.stop();
    }
  });

  describe('openSystemFlyout()', () => {
    it('closes the flyout when a CLOSE_SESSION event removes its session', () => {
      const ref = systemFlyouts.open(<div>System flyout content</div>, {
        id: 'parent-flyout-demo',
        session: 'start',
      });

      expect(mockReactDomUnmount).not.toHaveBeenCalled();

      emitEvent({
        type: 'CLOSE_SESSION',
        session: {
          mainFlyoutId: 'parent-flyout-demo',
          childFlyoutId: null,
        },
      });

      expect((ref as SystemFlyoutRef).isClosed).toBe(true);
      expect(mockReactDomUnmount).toHaveBeenCalledTimes(1);
    });

    it('renders a system flyout to the DOM', () => {
      expect(mockReactDomRender).not.toHaveBeenCalled();
      systemFlyouts.open(<div>System flyout content</div>);
      expect(mockReactDomRender).toHaveBeenCalledTimes(1);

      // Verify the render was called with React element
      const [renderedElement, container] = mockReactDomRender.mock.calls[0];
      expect(renderedElement).toBeDefined();
      expect(container).toBeDefined();
    });

    it('renders with default session="start"', () => {
      systemFlyouts.open(<div>System flyout content</div>);
      expect(mockReactDomRender).toHaveBeenCalledTimes(1);

      const { container } = render(mockReactDomRender.mock.calls[0][0]);
      expect(container.querySelector('[data-eui="EuiFlyout"]')).toBeTruthy();
    });

    it('renders with custom title at the top level', () => {
      systemFlyouts.open(<div>System flyout content</div>, {
        title: 'Top Level Title',
      });
      expect(mockReactDomRender).toHaveBeenCalledTimes(1);

      // Verify the title was passed through
      const renderedElement = mockReactDomRender.mock.calls[0][0];
      const euiFlyoutElement = renderedElement.props.children;
      expect(euiFlyoutElement.props.flyoutMenuProps.title).toBe('Top Level Title');
    });

    it('renders flyoutMenuProps with custom properties', () => {
      const expectedFlyoutMenuProps = {
        title: 'Visible Title',
        'data-test-subj': 'test-menu',
        hideTitle: false,
      };

      systemFlyouts.open(<div>System flyout content</div>, {
        flyoutMenuProps: expectedFlyoutMenuProps,
      });
      expect(mockReactDomRender).toHaveBeenCalledTimes(1);

      // Navigate to the actual EuiFlyout component to check its props
      const renderedElement = mockReactDomRender.mock.calls[0][0];
      // The structure is: KibanaRenderContextProvider > EuiFlyout
      const euiFlyoutElement = renderedElement.props.children;
      expect(euiFlyoutElement.props.flyoutMenuProps).toEqual(expectedFlyoutMenuProps);
    });

    it('gives precedence to flyoutMenuProps.title over top-level title', () => {
      systemFlyouts.open(<div>System flyout content</div>, {
        title: 'Top Level Title',
        flyoutMenuProps: { title: 'Menu Title', 'data-test-subj': 'test-menu' },
      });
      expect(mockReactDomRender).toHaveBeenCalledTimes(1);

      // Verify that flyoutMenuProps.title takes precedence
      const renderedElement = mockReactDomRender.mock.calls[0][0];
      const euiFlyoutElement = renderedElement.props.children;
      expect(euiFlyoutElement.props.flyoutMenuProps.title).toBe('Menu Title');
    });

    it('applies additional EuiFlyout options', () => {
      systemFlyouts.open(<div>System flyout content</div>, {
        size: 'l',
        maxWidth: 800,
        type: 'overlay',
        'aria-label': 'Custom Flyout',
      });
      expect(mockReactDomRender).toHaveBeenCalledTimes(1);

      const { container } = render(mockReactDomRender.mock.calls[0][0]);
      const flyout = container.querySelector('[data-eui="EuiFlyout"]');
      expect(flyout).toBeTruthy();
      // Verify the flyout was rendered with the options
      expect(mockReactDomRender.mock.calls[0][0]).toBeDefined();
    });

    it('returns an OverlayRef', () => {
      const ref = systemFlyouts.open(<div>System flyout content</div>);
      expect(ref).toHaveProperty('close');
      expect(ref).toHaveProperty('onClose');
      expect(ref.onClose).toBeInstanceOf(Promise);
    });

    it('accepts a custom onClose handler', () => {
      const onClose = jest.fn();
      const ref = systemFlyouts.open(<div>System flyout content</div>, {
        onClose,
      });

      // The onClose handler is passed to EuiFlyout
      // It will be called when the flyout's close button is clicked
      expect(ref).toHaveProperty('close');
      expect(ref).toHaveProperty('onClose');
    });

    describe('with multiple active flyouts', () => {
      let ref1: OverlayRef;
      let ref2: OverlayRef;

      beforeEach(() => {
        ref1 = systemFlyouts.open(<div>Flyout 1</div>);
        ref2 = systemFlyouts.open(<div>Flyout 2</div>);
      });

      it('allows multiple flyouts to be open simultaneously', () => {
        expect(mockReactDomRender).toHaveBeenCalledTimes(2);
      });

      it('closes flyouts independently', async () => {
        const onClose1 = jest.fn();
        const onClose2 = jest.fn();
        ref1.onClose.then(onClose1);
        ref2.onClose.then(onClose2);

        await ref1.close();
        expect(onClose1).toHaveBeenCalledTimes(1);
        expect(onClose2).not.toHaveBeenCalled();

        await ref2.close();
        expect(onClose2).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('FlyoutRef#close()', () => {
    it('resolves the onClose Promise', async () => {
      const ref = systemFlyouts.open(<div>System flyout content</div>);

      const onCloseComplete = jest.fn();
      ref.onClose.then(onCloseComplete);
      await ref.close();
      await ref.close();
      expect(onCloseComplete).toHaveBeenCalledTimes(1);
    });

    it('can be called multiple times on the same FlyoutRef', async () => {
      const ref = systemFlyouts.open(<div>System flyout content</div>);
      expect(mockReactDomUnmount).not.toHaveBeenCalled();

      const firstClose = await ref.close();
      const secondClose = await ref.close();

      // Both should return the same promise
      expect(firstClose).toBe(secondClose);
      // Unmount should only be called once total
      expect(mockReactDomUnmount).toHaveBeenCalledTimes(1);
    });

    it('removes the flyout container from the DOM', async () => {
      const targetElement = document.createElement('div');
      const testService = new SystemFlyoutService();
      const flyouts = testService.start({
        analytics: analyticsMock,
        i18n: i18nMock,
        theme: themeMock,
        userProfile: userProfileMock,
        targetDomElement: targetElement,
      });

      const ref = flyouts.open(<div>System flyout content</div>);
      expect(targetElement.children.length).toBe(1);

      await ref.close();
      expect(targetElement.children.length).toBe(0);

      testService.stop();
    });
  });

  describe('stop()', () => {
    it('closes all active flyouts', () => {
      skipCleanup = true;
      const testService = new SystemFlyoutService();
      const testTarget = document.createElement('div');
      const flyouts = testService.start({
        analytics: analyticsMock,
        i18n: i18nMock,
        theme: themeMock,
        userProfile: userProfileMock,
        targetDomElement: testTarget,
      });

      flyouts.open(<div>Flyout 1</div>);
      flyouts.open(<div>Flyout 2</div>);

      expect(testTarget.children.length).toBe(2);

      // Clear mocks to count only unmounts from this service
      mockReactDomUnmount.mockClear();

      testService.stop();

      // All flyouts should be unmounted
      expect(mockReactDomUnmount).toHaveBeenCalledTimes(2);
      expect(testTarget.children.length).toBe(0);
    });

    it('clears the targetDomElement reference', () => {
      const testService = new SystemFlyoutService();
      const targetElement = document.createElement('div');
      testService.start({
        analytics: analyticsMock,
        i18n: i18nMock,
        theme: themeMock,
        userProfile: userProfileMock,
        targetDomElement: targetElement,
      });

      testService.stop();

      // After stop, the service should have cleared its reference
      expect(() => {
        testService.start({
          analytics: analyticsMock,
          i18n: i18nMock,
          theme: themeMock,
          userProfile: userProfileMock,
          targetDomElement: targetElement,
        });
      }).not.toThrow();

      testService.stop();
    });
  });
});
