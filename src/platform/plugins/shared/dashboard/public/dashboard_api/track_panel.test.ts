/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { initializeTrackPanel } from './track_panel';

describe('track panel', () => {
  const mockDashboardContainerRef = document.createElement('div');
  const dashboardContainerRef$ = new BehaviorSubject<HTMLElement | null>(mockDashboardContainerRef);
  mockDashboardContainerRef.getBoundingClientRect = jest.fn(() => ({ top: 96 } as DOMRect));
  const {
    expandPanel,
    expandedPanelId$,
    focusedPanelId$,
    setFocusedPanelId,
    highlightPanelId$,
    highlightPanel,
    scrollToPanel,
    scrollPosition$,
    scrollToPanelId$,
    setHighlightPanelId,
    setScrollToPanelId,
    scrollToTop,
    scrollToBottom,
  } = initializeTrackPanel(async (id: string) => undefined, dashboardContainerRef$);

  document.documentElement.scrollTop = 100;
  document.documentElement.scrollTo = jest.fn();
  Object.defineProperty(document.documentElement, 'clientHeight', {
    configurable: true,
    value: 600,
  });
  const scrollToSpy = jest.spyOn(document.documentElement, 'scrollTo');

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('expand panel', () => {
    it('should expand the panel', () => {
      expandPanel('expanded-panel-id');
      expect(expandedPanelId$.value).toBe('expanded-panel-id');
      expect(scrollPosition$.value).toBe(100);
    });
  });

  describe('setFocusedPanelId', () => {
    it('should store the ID of the panel to focus', () => {
      setFocusedPanelId('focused-panel-id');
      expect(focusedPanelId$.value).toBe('focused-panel-id');
    });
  });

  describe('setScrollToPanelId', () => {
    it('should store the ID of the panel to scroll to', () => {
      setScrollToPanelId('scroll-to-panel-id');
      expect(scrollToPanelId$.value).toBe('scroll-to-panel-id');
    });
  });

  describe('setHighlightPanelId', () => {
    it('should store the ID of the panel to highlight', () => {
      setHighlightPanelId('highlight-panel-id');
      expect(highlightPanelId$.value).toBe('highlight-panel-id');
    });
  });

  describe('scrollToPanel', () => {
    it('should scroll to the current scrollPosition$ if defined', async () => {
      setScrollToPanelId('scroll-to-scroll-position-panel');

      expect(scrollToPanelId$.value).toBe('scroll-to-scroll-position-panel');
      expect(scrollPosition$.value).toBe(100);

      await scrollToPanel(document.createElement('div'));

      expect(scrollToSpy).toHaveBeenCalledWith({ top: 100, behavior: 'smooth' });
      expect(scrollToPanelId$.value).toBe(undefined);
      expect(scrollPosition$.value).toBe(undefined);
    });

    it('should scroll to panel when panel is below the viewport', async () => {
      setScrollToPanelId('scroll-to-panel-id');
      const mockPanelRef = document.createElement('div');
      mockPanelRef.getBoundingClientRect = jest.fn(
        () =>
          ({
            top: 200,
            bottom: 900,
          } as DOMRect)
      );
      mockPanelRef.scrollIntoView = jest.fn();
      expect(scrollPosition$.value).toBe(undefined);

      await scrollToPanel(mockPanelRef);
      expect(mockPanelRef.getBoundingClientRect).toHaveBeenCalled();
      expect(mockPanelRef.scrollIntoView).toHaveBeenCalledWith({
        block: 'start',
        behavior: 'smooth',
      });
      expect(scrollToPanelId$.value).toBe(undefined);
    });

    it('should scroll to panel when panel is above the viewport', async () => {
      setScrollToPanelId('scroll-to-panel-id');
      const mockPanelRef = document.createElement('div');
      mockPanelRef.getBoundingClientRect = jest.fn(
        () =>
          ({
            top: -100,
            bottom: 400,
          } as DOMRect)
      );
      mockPanelRef.scrollIntoView = jest.fn();
      expect(scrollPosition$.value).toBe(undefined);

      await scrollToPanel(mockPanelRef);
      expect(mockPanelRef.getBoundingClientRect).toHaveBeenCalled();
      expect(mockPanelRef.scrollIntoView).toHaveBeenCalledWith({
        block: 'start',
        behavior: 'smooth',
      });
      expect(scrollToPanelId$.value).toBe(undefined);
    });

    it('should skip the scroll if panel is already within the current viewport', async () => {
      setScrollToPanelId('skip-scroll-to-panel-id');

      const mockPanelRef = document.createElement('div');
      mockPanelRef.getBoundingClientRect = jest.fn(
        () =>
          ({
            top: 200,
            bottom: 500,
          } as DOMRect)
      );
      mockPanelRef.scrollIntoView = jest.fn();

      await scrollToPanel(mockPanelRef);
      expect(mockPanelRef.getBoundingClientRect).toHaveBeenCalled();
      expect(mockPanelRef.scrollIntoView).not.toHaveBeenCalled();
      expect(scrollToPanelId$.value).toBe(undefined);
    });
  });

  describe('highlightPanel', () => {
    it('should set the scroll position to the panel', () => {
      setHighlightPanelId('highlight-panel-id');
      const mockPanelRef = document.createElement('div');
      highlightPanel(mockPanelRef);
      setTimeout(() => {
        expect(mockPanelRef.classList.contains('dshDashboardGrid__item--highlighted')).toBe(true);
      });
      expect(highlightPanelId$.value).toBe(undefined);
    });
  });

  describe('scrollToTop', () => {
    it('should scroll to the top of the dashboard container', () => {
      scrollToTop();
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });
  });

  describe('scrollToBottom', () => {
    it('should scroll to the bottom of the dashboard container', () => {
      scrollToBottom();
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: document.body.scrollHeight,
        behavior: 'smooth',
      });
    });
  });
});
