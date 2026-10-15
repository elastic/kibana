/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';
import type { NavigationCustomization } from '@kbn/core-chrome-browser';
import { NavigationCustomizationReporter } from './navigation_customization_reporter';
import { NAV_CUSTOMIZATION_EVENT_TYPE, NAV_LOADED_EVENT_TYPE } from './telemetry';

/** Drain the microtask queue (resolved promise .then()s) before asserting. */
const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

/**
 * `NavigationCustomization['hidden']` is typed as `AppDeepLinkId[]`. The tests use
 * synthetic ids ('a', 'b'), so this keeps the necessary cast in one readable place.
 */
const asHidden = (...ids: string[]): NavigationCustomization['hidden'] =>
  ids as NavigationCustomization['hidden'];

const makeAnalytics = () =>
  ({ reportEvent: jest.fn() } as unknown as AnalyticsServiceStart & { reportEvent: jest.Mock });

describe('NavigationCustomizationReporter', () => {
  describe('reportLoadedOnce()', () => {
    it('reports nav_customize_state: false when nothing is stored', async () => {
      const analytics = makeAnalytics();
      const reporter = new NavigationCustomizationReporter();

      reporter.reportLoadedOnce({
        analytics,
        getCurrentUser: () => Promise.resolve({ username: 'u' }),
        savedCustomization: undefined,
      });
      await flushAsync();

      expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(analytics.reportEvent).toHaveBeenCalledWith(NAV_LOADED_EVENT_TYPE, {
        nav_customize_state: false,
      });
    });

    it('reports nav_customize_state: true when a non-default customization is stored', async () => {
      const analytics = makeAnalytics();
      const reporter = new NavigationCustomizationReporter();

      reporter.reportLoadedOnce({
        analytics,
        getCurrentUser: () => Promise.resolve({ username: 'u' }),
        savedCustomization: { moves: [{ id: 'b', afterId: 'a' }], hidden: [] },
      });
      await flushAsync();

      expect(analytics.reportEvent).toHaveBeenCalledWith(NAV_LOADED_EVENT_TYPE, {
        nav_customize_state: true,
      });
    });

    it('treats an empty stored customization as the default (nav_customize_state: false)', async () => {
      const analytics = makeAnalytics();
      const reporter = new NavigationCustomizationReporter();

      reporter.reportLoadedOnce({
        analytics,
        getCurrentUser: () => Promise.resolve({ username: 'u' }),
        savedCustomization: { moves: [], hidden: [] },
      });
      await flushAsync();

      expect(analytics.reportEvent).toHaveBeenCalledWith(NAV_LOADED_EVENT_TYPE, {
        nav_customize_state: false,
      });
    });

    it('gates the event on the user signal so EBT can stamp context.userId', async () => {
      const analytics = makeAnalytics();
      const getCurrentUser = jest.fn().mockResolvedValue({ username: 'u' });
      const reporter = new NavigationCustomizationReporter();

      reporter.reportLoadedOnce({ analytics, getCurrentUser, savedCustomization: undefined });

      // Not emitted synchronously: it waits for getCurrentUser() to resolve so
      // context.userId is stamped before the event ships.
      expect(getCurrentUser).toHaveBeenCalledTimes(1);
      expect(analytics.reportEvent).not.toHaveBeenCalled();

      await flushAsync();
      expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    });

    it('still emits once even if the user signal rejects', async () => {
      const analytics = makeAnalytics();
      const reporter = new NavigationCustomizationReporter();

      reporter.reportLoadedOnce({
        analytics,
        getCurrentUser: () => Promise.reject(new Error('no user')),
        savedCustomization: undefined,
      });
      await flushAsync();

      expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(analytics.reportEvent).toHaveBeenCalledWith(NAV_LOADED_EVENT_TYPE, {
        nav_customize_state: false,
      });
    });

    it('reports at most once across repeated calls', async () => {
      const analytics = makeAnalytics();
      const reporter = new NavigationCustomizationReporter();
      const deps = {
        analytics,
        getCurrentUser: () => Promise.resolve({ username: 'u' }),
        savedCustomization: undefined,
      };

      reporter.reportLoadedOnce(deps);
      reporter.reportLoadedOnce(deps);
      await flushAsync();

      expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('reportSave()', () => {
    it('does not report until a solution has resolved', () => {
      const analytics = makeAnalytics();
      const reporter = new NavigationCustomizationReporter();

      reporter.reportSave({
        analytics,
        customization: { moves: [{ id: 'b', afterId: null }], hidden: [] },
        order: ['b', 'a'],
        hiddenIds: [],
      });

      expect(analytics.reportEvent).not.toHaveBeenCalled();
    });

    it('reports default_saved / did_customize: false when the layout matches the default', () => {
      const analytics = makeAnalytics();
      const reporter = new NavigationCustomizationReporter();
      reporter.markSolutionResolved();

      reporter.reportSave({
        analytics,
        customization: { moves: [], hidden: [] },
        order: ['a', 'b'],
        hiddenIds: [],
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        NAV_CUSTOMIZATION_EVENT_TYPE,
        expect.objectContaining({
          action: 'default_saved',
          did_customize: false,
          visible_item_ids: ['a', 'b'],
          hidden_item_ids: [],
        })
      );
    });

    it('reports customization_saved / did_customize: true when the user reordered items', () => {
      const analytics = makeAnalytics();
      const reporter = new NavigationCustomizationReporter();
      reporter.markSolutionResolved();

      reporter.reportSave({
        analytics,
        customization: { moves: [{ id: 'b', afterId: null }], hidden: [] },
        order: ['b', 'a'],
        hiddenIds: [],
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        NAV_CUSTOMIZATION_EVENT_TYPE,
        expect.objectContaining({
          action: 'customization_saved',
          did_customize: true,
          visible_item_ids: ['b', 'a'],
        })
      );
    });

    it('reports hidden items under hidden_item_ids and keeps them out of visible_item_ids', () => {
      const analytics = makeAnalytics();
      const reporter = new NavigationCustomizationReporter();
      reporter.markSolutionResolved();

      reporter.reportSave({
        analytics,
        customization: { moves: [], hidden: asHidden('b') },
        order: ['a', 'b'],
        hiddenIds: ['b'],
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        NAV_CUSTOMIZATION_EVENT_TYPE,
        expect.objectContaining({
          action: 'customization_saved',
          did_customize: true,
          visible_item_ids: ['a'],
          hidden_item_ids: ['b'],
        })
      );
    });
  });
});
