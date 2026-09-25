/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getHitlChannelConnectorTypeFromPath, isHitlWaitStepType } from './hitl';

describe('getHitlChannelConnectorTypeFromPath', () => {
  it('maps slack and slack_api channel connector-id paths', () => {
    expect(getHitlChannelConnectorTypeFromPath(['with', 'channels', 'slack', 'connector-id'])).toBe(
      'slack'
    );
    expect(
      getHitlChannelConnectorTypeFromPath([
        'steps',
        0,
        'with',
        'channels',
        'slack_api',
        'connector-id',
      ])
    ).toBe('slack_api');
  });

  it('returns null outside a HITL channel connector-id path', () => {
    expect(getHitlChannelConnectorTypeFromPath(['steps', 0, 'connector-id'])).toBeNull();
    expect(getHitlChannelConnectorTypeFromPath(['with', 'schema', 'type'])).toBeNull();
    expect(getHitlChannelConnectorTypeFromPath(undefined)).toBeNull();
  });
});

describe('isHitlWaitStepType', () => {
  it('recognizes waitForInput and waitForApproval', () => {
    expect(isHitlWaitStepType('waitForInput')).toBe(true);
    expect(isHitlWaitStepType('waitForApproval')).toBe(true);
    expect(isHitlWaitStepType('slack')).toBe(false);
  });
});
