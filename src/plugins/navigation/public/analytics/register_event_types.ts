/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, EventTypeOpts, RootSchema } from '@kbn/core/public';
import {
  FieldType as NavigationFieldType,
  EventType as NavigationEventType,
} from '@kbn/shared-ux-chrome-navigation';

const fields: Record<NavigationFieldType, RootSchema<Record<string, unknown>>> = {
  [NavigationFieldType.ID]: {
    [NavigationFieldType.ID]: {
      type: 'keyword',
      _meta: {
        description: 'The ID of navigation node.',
      },
    },
  },
  [NavigationFieldType.HREF]: {
    [NavigationFieldType.HREF]: {
      type: 'keyword',
      _meta: {
        description: 'The href of the navigation node.',
        optional: true,
      },
    },
  },
  [NavigationFieldType.HREF_PREV]: {
    [NavigationFieldType.HREF_PREV]: {
      type: 'keyword',
      _meta: {
        description: 'The previous href before clicking on a navigation node.',
        optional: true,
      },
    },
  },
};

const eventTypes: Array<EventTypeOpts<Record<string, unknown>>> = [
  {
    eventType: NavigationEventType.CLICK_NAVLINK,
    schema: {
      ...fields[NavigationFieldType.ID],
      ...fields[NavigationFieldType.HREF],
      ...fields[NavigationFieldType.HREF_PREV],
    },
  },
];

export function registerNavigationEventTypes(core: CoreSetup) {
  const { analytics } = core;
  for (const eventType of eventTypes) {
    analytics.registerEventType(eventType);
  }
}
