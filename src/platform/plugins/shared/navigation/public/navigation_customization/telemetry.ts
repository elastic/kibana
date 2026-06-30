/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core/public';
import type { SolutionId } from '@kbn/core-chrome-browser';

export const NAV_CUSTOMIZATION_EVENT_TYPE = 'navigation_customization';

export interface NavCustomizationEventProps {
  space_type: SolutionId;
  did_customize: boolean;
  /** Visible nav item IDs in display order (array index = position). */
  visible_item_ids: string[];
  /** Hidden nav item IDs (under the "More" menu), in their original order. */
  hidden_item_ids: string[];
}

/**
 * Builds the nav-item ID arrays expected by the EBT event.
 * Array position encodes order; no separate `order` field is needed.
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
    eventType: NAV_CUSTOMIZATION_EVENT_TYPE,
    schema: {
      space_type: {
        type: 'keyword',
        _meta: {
          description:
            'The solution type of the space in which the navigation was customized (one of the Kibana solution/project ids, e.g. es, oblt, security, workplaceai, vectordb).',
        },
      },
      did_customize: {
        type: 'boolean',
        _meta: {
          description:
            'True when the user applied a non-default arrangement. False when the layout is the default — either the baseline detected at setup, or a save that produced the default (e.g. "Reset to default").',
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

export function reportNavigationCustomization(
  analytics: AnalyticsServiceStart,
  props: NavCustomizationEventProps
): void {
  analytics.reportEvent(NAV_CUSTOMIZATION_EVENT_TYPE, props);
}
