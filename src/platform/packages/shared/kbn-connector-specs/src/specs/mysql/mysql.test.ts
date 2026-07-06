/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MysqlConnector } from './mysql';

describe('MysqlConnector', () => {
  it('should be defined', () => {
    expect(MysqlConnector).toBeDefined();
  });

  it('should have the correct metadata', () => {
    expect(MysqlConnector.metadata.id).toBe('.mysql');
    expect(MysqlConnector.metadata.displayName).toBe('MySQL');
  });

  it('should have the expected actions', () => {
    expect(MysqlConnector.actions).toHaveProperty('query');
    expect(MysqlConnector.actions).toHaveProperty('listDatabases');
    expect(MysqlConnector.actions).toHaveProperty('listTables');
    expect(MysqlConnector.actions).toHaveProperty('describeTable');
    expect(MysqlConnector.actions).toHaveProperty('searchRows');
  });

  it('should not use auth types (credentials are in the schema)', () => {
    expect(MysqlConnector.auth).toBeUndefined();
  });

  it('should be marked as technical preview', () => {
    expect(MysqlConnector.metadata.isTechnicalPreview).toBe(true);
  });

  it('should support agentBuilder feature', () => {
    expect(MysqlConnector.metadata.supportedFeatureIds).toContain('agentBuilder');
  });

  it('should mark all actions as tools', () => {
    for (const action of Object.values(MysqlConnector.actions)) {
      expect(action.isTool).toBe(true);
    }
  });
});
