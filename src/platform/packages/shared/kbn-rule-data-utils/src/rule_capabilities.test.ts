/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Capabilities } from '@kbn/core-capabilities-common';
import { canAccessTriggersActionsRules } from './rule_capabilities';

describe('canAccessTriggersActionsRules', () => {
  it('returns true when the triggersActionsRules capability is granted', () => {
    const capabilities = {
      management: { insightsAndAlerting: { triggersActionsRules: true } },
    } as unknown as Capabilities;

    expect(canAccessTriggersActionsRules(capabilities)).toBe(true);
  });

  it('returns false when the capability is explicitly denied', () => {
    const capabilities = {
      management: { insightsAndAlerting: { triggersActionsRules: false } },
    } as unknown as Capabilities;

    expect(canAccessTriggersActionsRules(capabilities)).toBe(false);
  });

  it('returns false when the insightsAndAlerting section is absent', () => {
    const capabilities = { management: {} } as unknown as Capabilities;

    expect(canAccessTriggersActionsRules(capabilities)).toBe(false);
  });

  it('returns false when the management section is absent', () => {
    const capabilities = {} as Capabilities;

    expect(canAccessTriggersActionsRules(capabilities)).toBe(false);
  });
});
