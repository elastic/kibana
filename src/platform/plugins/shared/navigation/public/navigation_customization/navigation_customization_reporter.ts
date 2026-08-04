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
import {
  buildNavItemsProperties,
  reportNavigationCustomization,
  reportNavigationLoaded,
} from './telemetry';

export interface ReportLoadedDeps {
  analytics: AnalyticsServiceStart;
  /** The platform user signal (e.g. `core.security.authc.getCurrentUser`). */
  getCurrentUser: () => Promise<unknown>;
  /** The customization currently stored for this user/space, if any. */
  savedCustomization: NavigationCustomization | undefined;
}

export interface ReportSaveDeps {
  analytics: AnalyticsServiceStart;
  /** The customization the user just applied. */
  customization: NavigationCustomization;
  /** Visible-item ids in display order. */
  order: string[];
  /** Ids the user hid under "More". */
  hiddenIds: string[];
}

/**
 * Owns the navigation-customization telemetry orchestration: when each event
 * fires and the once-per-lifecycle dedupe state behind it. The wire-format
 * concerns (event names, schema, prop shape) live in `./telemetry`; this class
 * only decides when to emit and derives the payload from data the service hands it.
 */
export class NavigationCustomizationReporter {
  /** Guards the per-load event so it fires at most once per lifecycle. */
  private loadedReported = false;
  /** Whether the active space has resolved to a solution, gating the save event. */
  private solutionResolved = false;

  /** Records that the active space resolved to a solution, enabling save reporting. */
  markSolutionResolved(): void {
    this.solutionResolved = true;
  }

  /**
   * Emits the per-load nav-state event at most once. Gated on the user signal so
   * EBT's context.userId (from the same cached getCurrentUser()) is stamped before
   * we emit, avoiding a null-userId bucket; emitted regardless of resolve/reject so
   * the event is never dropped.
   */
  reportLoadedOnce({ analytics, getCurrentUser, savedCustomization }: ReportLoadedDeps): void {
    if (this.loadedReported) return;
    this.loadedReported = true;

    const navCustomizeState =
      savedCustomization !== undefined &&
      (savedCustomization.moves.length > 0 || savedCustomization.hidden.length > 0);
    const emit = () =>
      reportNavigationLoaded(analytics, { nav_customize_state: navCustomizeState });

    getCurrentUser().then(emit, emit);
  }

  /**
   * Emits the save event for a persisted layout. No-op until a solution has
   * resolved, since the event's space breakdown depends on that context.
   */
  reportSave({ analytics, customization, order, hiddenIds }: ReportSaveDeps): void {
    if (!this.solutionResolved) return;

    const hiddenSet = new Set(hiddenIds);
    // A save with no moves and nothing hidden does not count as a customization.
    const didCustomize = customization.moves.length > 0 || customization.hidden.length > 0;

    reportNavigationCustomization(analytics, {
      action: didCustomize ? 'customization_saved' : 'default_saved',
      did_customize: didCustomize,
      ...buildNavItemsProperties(order.map((id) => ({ id, hidden: hiddenSet.has(id) }))),
    });
  }
}
