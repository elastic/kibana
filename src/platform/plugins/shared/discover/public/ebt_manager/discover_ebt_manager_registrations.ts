/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/public';
import type { BehaviorSubject } from 'rxjs';
import type { DiscoverStartPlugins } from '../types';
import type { DiscoverEBTContextProps } from './types';

/**
 * Field usage events i.e. when a field is selected in the data table, removed from the data table, or a filter is added
 */
export const FIELD_USAGE_EVENT_TYPE = 'discover_field_usage';
export const FIELD_USAGE_EVENT_NAME = 'eventName';
export const FIELD_USAGE_FIELD_NAME = 'fieldName';
export const FIELD_USAGE_FILTER_OPERATION = 'filterOperation';

/**
 * Contextual profile resolved event i.e. when a different contextual profile is resolved at root, data source, or document level
 * Duplicated events for the same profile level will not be sent.
 */
export const CONTEXTUAL_PROFILE_RESOLVED_EVENT_TYPE = 'discover_profile_resolved';
export const CONTEXTUAL_PROFILE_LEVEL = 'contextLevel';
export const CONTEXTUAL_PROFILE_ID = 'profileId';

/**
 * This function is statically imported since analytics registrations must happen at setup,
 * while the EBT manager is loaded dynamically when needed to avoid page load bundle bloat
 */
export const registerDiscoverEBTManagerAnalytics = (
  core: CoreSetup<DiscoverStartPlugins>,
  discoverEbtContext$: BehaviorSubject<DiscoverEBTContextProps>
) => {
  // Register Discover specific context to be used in EBT
  core.analytics.registerContextProvider({
    name: 'discover_context',
    context$: discoverEbtContext$,
    schema: {
      discoverProfiles: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description: 'List of active Discover context awareness profiles',
          },
        },
      },
      // If we decide to extend EBT context with more properties, we can do it here
    },
  });

  // Register Discover events to be used with EBT
  core.analytics.registerEventType({
    eventType: FIELD_USAGE_EVENT_TYPE,
    schema: {
      [FIELD_USAGE_EVENT_NAME]: {
        type: 'keyword',
        _meta: {
          description:
            'The name of the event that is tracked in the metrics i.e. dataTableSelection, dataTableRemoval',
        },
      },
      [FIELD_USAGE_FIELD_NAME]: {
        type: 'keyword',
        _meta: {
          description: "Field name if it's a part of ECS schema",
          optional: true,
        },
      },
      [FIELD_USAGE_FILTER_OPERATION]: {
        type: 'keyword',
        _meta: {
          description: "Operation type when a filter is added i.e. '+', '-', '_exists_'",
          optional: true,
        },
      },
    },
  });

  core.analytics.registerEventType({
    eventType: CONTEXTUAL_PROFILE_RESOLVED_EVENT_TYPE,
    schema: {
      [CONTEXTUAL_PROFILE_LEVEL]: {
        type: 'keyword',
        _meta: {
          description:
            'The context level at which it was resolved i.e. rootLevel, dataSourceLevel, documentLevel',
        },
      },
      [CONTEXTUAL_PROFILE_ID]: {
        type: 'keyword',
        _meta: {
          description: 'The resolved name of the active profile',
        },
      },
    },
  });
};
