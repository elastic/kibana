/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function buildTriggerEventReplayInputs(
  source: Record<string, unknown>,
  currentSpaceId: string
): Record<string, unknown> {
  const rawPayload = source.payload;
  const payload =
    rawPayload !== null && typeof rawPayload === 'object' && !Array.isArray(rawPayload)
      ? { ...(rawPayload as Record<string, unknown>) }
      : {};

  return {
    event: {
      ...payload,
      timestamp: new Date().toISOString(),
      spaceId: currentSpaceId,
      eventChainDepth: 0,
      eventChainVisitedWorkflowIds: [] as string[],
    },
  };
}
