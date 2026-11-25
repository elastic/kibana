/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  OUTBOUND_ENABLED_CONFIG_KEY,
  getUsableSelectedActions,
  isConnectorOutboundActionsEnabled,
} from './outbound_actions';

const DUAL_TYPE_ID = '.slack2';
const OUTBOUND_ONLY_TYPE_ID = '.unifi';

describe('OUTBOUND_ENABLED_CONFIG_KEY', () => {
  it('is outboundEnabled', () => {
    expect(OUTBOUND_ENABLED_CONFIG_KEY).toBe('outboundEnabled');
  });
});

describe('isConnectorOutboundActionsEnabled', () => {
  it('is on when the config has no key', () => {
    expect(isConnectorOutboundActionsEnabled({ actionTypeId: DUAL_TYPE_ID, config: {} })).toBe(
      true
    );
    expect(isConnectorOutboundActionsEnabled({ actionTypeId: DUAL_TYPE_ID })).toBe(true);
    expect(isConnectorOutboundActionsEnabled({ actionTypeId: DUAL_TYPE_ID, config: null })).toBe(
      true
    );
  });

  it('is off for a dual type when the config key is false', () => {
    expect(
      isConnectorOutboundActionsEnabled({
        actionTypeId: DUAL_TYPE_ID,
        config: { outboundEnabled: false },
      })
    ).toBe(false);
  });

  it('is on for a dual type when the config key is true', () => {
    expect(
      isConnectorOutboundActionsEnabled({
        actionTypeId: DUAL_TYPE_ID,
        config: { outboundEnabled: true },
      })
    ).toBe(true);
  });

  it('ignores the config key on a type that is not dual', () => {
    expect(
      isConnectorOutboundActionsEnabled({
        actionTypeId: OUTBOUND_ONLY_TYPE_ID,
        config: { outboundEnabled: false },
      })
    ).toBe(true);
  });

  it('lets the top-level field win over the config key', () => {
    expect(
      isConnectorOutboundActionsEnabled({
        actionTypeId: DUAL_TYPE_ID,
        config: { outboundEnabled: false },
        isOutboundActionsEnabled: true,
      })
    ).toBe(true);
    expect(
      isConnectorOutboundActionsEnabled({
        actionTypeId: DUAL_TYPE_ID,
        config: {},
        isOutboundActionsEnabled: false,
      })
    ).toBe(false);
  });
});

describe('getUsableSelectedActions', () => {
  it('returns an empty list when outbound is off', () => {
    expect(
      getUsableSelectedActions({
        actionTypeId: DUAL_TYPE_ID,
        config: { outboundEnabled: false, selectedActions: ['sendMessage'] },
      })
    ).toEqual([]);
  });

  it('returns an empty list when the top-level field is off and there is no config', () => {
    expect(
      getUsableSelectedActions({ actionTypeId: DUAL_TYPE_ID, isOutboundActionsEnabled: false })
    ).toEqual([]);
  });

  it('returns the stored selection when outbound is on', () => {
    expect(
      getUsableSelectedActions({
        actionTypeId: DUAL_TYPE_ID,
        config: { selectedActions: ['sendMessage'] },
      })
    ).toEqual(['sendMessage']);
  });

  it('returns undefined when outbound is on and there is no selection', () => {
    expect(getUsableSelectedActions({ actionTypeId: DUAL_TYPE_ID, config: {} })).toBeUndefined();
    expect(getUsableSelectedActions({ actionTypeId: DUAL_TYPE_ID })).toBeUndefined();
  });

  it('keeps the selection of a type that is not dual even with the stray key', () => {
    expect(
      getUsableSelectedActions({
        actionTypeId: OUTBOUND_ONLY_TYPE_ID,
        config: { outboundEnabled: false, selectedActions: ['a'] },
      })
    ).toEqual(['a']);
  });
});
