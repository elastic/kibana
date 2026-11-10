/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  encodeHitlSlackCorrelation,
  HITL_SLACK_CORRELATION_VERSION,
} from './hitl_slack_interactive';

describe('hitl_slack_interactive', () => {
  it('encodes the compact correlation the Slack inbound parser accepts', () => {
    expect(
      JSON.parse(
        encodeHitlSlackCorrelation({
          v: HITL_SLACK_CORRELATION_VERSION,
          executionId: 'exec-1',
          stepId: 'step-1',
          token: 'a'.repeat(64),
          spaceId: 'default',
          kind: 'input',
        })
      )
    ).toEqual({
      v: 1,
      e: 'exec-1',
      s: 'step-1',
      t: 'a'.repeat(64),
      p: 'default',
      k: 'i',
    });
  });

  it('rejects a correlation that exceeds the Slack button value limit', () => {
    expect(() =>
      encodeHitlSlackCorrelation({
        v: HITL_SLACK_CORRELATION_VERSION,
        executionId: 'e'.repeat(2000),
        stepId: 'step-1',
        token: 'token',
        spaceId: 'default',
        kind: 'approval',
      })
    ).toThrow(/exceeds 2000/);
  });
});
