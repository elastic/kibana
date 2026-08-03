/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AzureMonitor } from './azure_monitor';

describe('AzureMonitor', () => {
  it('should be defined', () => {
    expect(AzureMonitor).toBeDefined();
  });

  it('has a leading-dot connector id', () => {
    expect(AzureMonitor.metadata.id).toBe('.azure_monitor');
  });

  it('exposes every action as an agent-discoverable tool', () => {
    const actionNames = Object.keys(AzureMonitor.actions);
    expect(actionNames.length).toBeGreaterThan(0);
    for (const name of actionNames) {
      expect(AzureMonitor.actions[name].isTool).toBe(true);
      expect(AzureMonitor.actions[name].description).toBeTruthy();
    }
  });

  it('enables the test-connector handler', () => {
    expect(AzureMonitor.test?.enabled).toBe(true);
  });
});
