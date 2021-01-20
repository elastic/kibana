/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const MockLegacyClusterClient = jest.fn();
jest.mock('./legacy/cluster_client', () => ({ LegacyClusterClient: MockLegacyClusterClient }));

export const MockClusterClient = jest.fn();
jest.mock('./client/cluster_client', () => ({ ClusterClient: MockClusterClient }));
