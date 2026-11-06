/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core/public';

/** Fired once per page load with the current customized-vs-default state. */
export const NAV_LOADED_EVENT_TYPE = 'navigation_loaded';

/** Fired when the user persists a layout from the "Customize navigation" modal. */
export const NAV_CUSTOMIZATION_EVENT_TYPE = 'navigation_customization';

export type NavCustomizationAction = 'customization_saved' | 'default_saved';

export interface NavLoadedEventProps {
  /**
   * Whether a non-default customization is currently stored for this user/space.
   * Deduped at query time by the platform-provided `context.userId`, so no per-user write
   * is needed to derive an adoption denominator/numerator from this event.
   */
  nav_customize_state: boolean;
}

export interface NavCustomizationEventProps {
  action: NavCustomizationAction;
  did_customize: boolean;
  /** Visible nav item IDs in display order (array index = position). */
  visible_item_ids: string[];
  /** Hidden nav item IDs (under the "More" menu), in their original order. */
  hidden_item_ids: string[];
}

/**
 * Builds the nav-item ID arrays expected by the save event.
 */
export function buildNavItemsProperties(
  itemsInOrder: Array<{ id: string; hidden: boolean }>
): Pick<NavCustomizationEventProps, 'visible_item_ids' | 'hidden_item_ids'> {
  return {
    visible_item_ids: itemsInOrder.filter((it) => !it.hidden).map((it) => it.id),
    hidden_item_ids: itemsInOrder.filter((it) => it.hidden).map((it) => it.id),
  };
}

export function registerNavigationCustomizationEvents(analytics: AnalyticsServiceSetup): void {
  analytics.registerEventType({
    eventType: NAV_LOADED_EVENT_TYPE,
    schema: {
      nav_customize_state: {
        type: 'boolean',
        _meta: {
          description:
            'True if a non-default navigation customization is stored for this user/space at page load. Dedupe by context.userId at query time and break down by context.spaceSolution; this event is not deduped at emit time.',
        },
      },
    },
  });

  analytics.registerEventType({
    eventType: NAV_CUSTOMIZATION_EVENT_TYPE,
    schema: {
      action: {
        type: 'keyword',
        _meta: {
          description:
            'What caused the save: customization_saved for a persisted non-default save, or default_saved for a persisted reset/default save.',
        },
      },
      did_customize: {
        type: 'boolean',
        _meta: {
          description:
            'True for a persisted non-default customization. False for a persisted reset/default save.',
        },
      },
      visible_item_ids: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description: 'Visible nav item IDs in display order. Array index encodes position.',
          },
        },
      },
      hidden_item_ids: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description: 'Nav item IDs hidden under the "More" menu, in their original order.',
          },
        },
      },
    },
  });
}

export function reportNavigationLoaded(
  analytics: AnalyticsServiceStart,
  props: NavLoadedEventProps
): void {
  analytics.reportEvent(NAV_LOADED_EVENT_TYPE, props);
}

export function reportNavigationCustomization(
  analytics: AnalyticsServiceStart,
  props: NavCustomizationEventProps
): void {
  analytics.reportEvent(NAV_CUSTOMIZATION_EVENT_TYPE, props);
}
