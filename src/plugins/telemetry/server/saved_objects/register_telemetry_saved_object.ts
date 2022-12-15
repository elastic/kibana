/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsServiceSetup } from '@kbn/core-saved-objects-server';
import { TELEMETRY_SAVED_OBJECT_ID } from './constants';

export function registerTelemetrySavedObject(
  registerType: SavedObjectsServiceSetup['registerType']
) {
  registerType({
    name: TELEMETRY_SAVED_OBJECT_ID,
    hidden: true,
    namespaceType: 'agnostic',
    mappings: {
      properties: {
        enabled: {
          type: 'boolean',
        },
        sendUsageFrom: {
          type: 'keyword',
        },
        lastReported: {
          type: 'date',
        },
        lastVersionChecked: {
          type: 'keyword',
        },
        userHasSeenNotice: {
          type: 'boolean',
        },
        reportFailureCount: {
          type: 'integer',
        },
        reportFailureVersion: {
          type: 'keyword',
        },
        allowChangingOptInStatus: {
          type: 'boolean',
        },
      },
    },
  });
}
