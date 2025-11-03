/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ActionConnector,
  PreConfiguredActionConnector,
  SystemAction,
  UserConfiguredActionConnector,
} from '../types';

// Overload signatures
export function createMockActionConnector(
  overrides: Partial<PreConfiguredActionConnector>
): PreConfiguredActionConnector;
export function createMockActionConnector(overrides: Partial<SystemAction>): SystemAction;
export function createMockActionConnector<
  Secrets = Record<string, unknown>,
  Config = Record<string, unknown>
>(
  overrides: Partial<UserConfiguredActionConnector<Secrets, Config>>
): UserConfiguredActionConnector<Secrets, Config>;

export function createMockActionConnector<
  Config = Record<string, unknown>,
  Secrets = Record<string, unknown>
>(
  overrides: Partial<ActionConnector> = {}
): PreConfiguredActionConnector | SystemAction | UserConfiguredActionConnector<Secrets, Config> {
  if (overrides.isPreconfigured === true) {
    return {
      id: 'test',
      actionTypeId: '.test-connector-type',
      name: 'Test Connector',
      isDeprecated: false,
      isConnectorTypeDeprecated: false,
      ...overrides,
      isSystemAction: false,
      isPreconfigured: true,
    } as PreConfiguredActionConnector;
  }
  if (overrides.isSystemAction === true) {
    return {
      id: 'test',
      actionTypeId: '.test-connector-type',
      name: 'Test Connector',
      isDeprecated: false,
      isConnectorTypeDeprecated: false,
      ...overrides,
      isPreconfigured: false,
      isSystemAction: true,
    } as SystemAction;
  }

  return {
    id: 'test',
    actionTypeId: '.test-connector-type',
    name: 'Test Connector',
    config: {},
    secrets: {},
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    isConnectorTypeDeprecated: false,
    ...overrides,
  } as UserConfiguredActionConnector<Secrets, Config>;
}
