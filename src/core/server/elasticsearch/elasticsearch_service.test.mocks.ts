/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const MockClusterClient = jest.fn();
jest.mock('./client/cluster_client', () => ({ ClusterClient: MockClusterClient }));

export const isScriptingEnabledMock = jest.fn();
jest.doMock('./is_scripting_enabled', () => ({
  isInlineScriptingEnabled: isScriptingEnabledMock,
}));
