/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  decodeHitlSlackCorrelation,
  encodeHitlSlackCorrelation,
  HITL_SLACK_ACTION_APPROVE,
  HITL_SLACK_CORRELATION_VERSION,
  isHitlSlackActionId,
} from './hitl_slack_interactive';

describe('hitl_slack_interactive', () => {
  it('round-trips correlation payloads', () => {
    const encoded = encodeHitlSlackCorrelation({
      v: HITL_SLACK_CORRELATION_VERSION,
      executionId: 'exec-1',
      stepId: 'step-1',
      token: 'a'.repeat(64),
      spaceId: 'default',
      kind: 'approval',
    });
    expect(decodeHitlSlackCorrelation(encoded)).toEqual({
      v: HITL_SLACK_CORRELATION_VERSION,
      executionId: 'exec-1',
      stepId: 'step-1',
      token: 'a'.repeat(64),
      spaceId: 'default',
      kind: 'approval',
    });
  });

  it('rejects malformed correlation', () => {
    expect(decodeHitlSlackCorrelation('')).toBeUndefined();
    expect(decodeHitlSlackCorrelation('not-json')).toBeUndefined();
    expect(decodeHitlSlackCorrelation(JSON.stringify({ v: 2 }))).toBeUndefined();
  });

  it('recognizes HITL action ids', () => {
    expect(isHitlSlackActionId(HITL_SLACK_ACTION_APPROVE)).toBe(true);
    expect(isHitlSlackActionId('something.else')).toBe(false);
  });
});
