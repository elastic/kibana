/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import type { DiscoverSessionApiResponse } from './schema';

type DiscoverSessionOperation = 'create' | 'update' | 'delete';
type DiscoverSessionActivityResult = Pick<DiscoverSessionApiResponse, 'id'> & {
  data: Pick<DiscoverSessionApiResponse['data'], 'title' | 'tags'>;
};

const operationConfig = {
  create: {
    action: 'discover_session_create',
    eventType: 'creation',
    verb: 'created',
  },
  update: {
    action: 'discover_session_update',
    eventType: 'change',
    verb: 'updated',
  },
  delete: {
    action: 'discover_session_delete',
    eventType: 'deletion',
    verb: 'deleted',
  },
} as const;

export const trackDiscoverSessionAction = (
  userActivity: CoreSetup['userActivity'],
  operation: DiscoverSessionOperation,
  result: DiscoverSessionActivityResult
): void => {
  const { action, eventType, verb } = operationConfig[operation];

  try {
    userActivity.trackUserAction({
      message: `User ${verb} Discover session "${result.data.title}" (id: ${result.id}).`,
      event: {
        action,
        type: eventType,
      },
      object: {
        id: result.id,
        name: result.data.title,
        type: 'discover_session',
        // Discover session activity records tag IDs
        tags: result.data.tags ?? [],
      },
    });
  } catch {
    // Tracking must not affect a successful API request.
  }
};
