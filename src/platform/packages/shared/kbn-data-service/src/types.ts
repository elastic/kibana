/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * If a service is being shared on both the client and the server, and
 * the client code requires synchronous access to uiSettings, both client
 * and server should wrap the core uiSettings services in a function
 * matching this signature.
 *
 * This matches the signature of the public `core.uiSettings.get`, and
 * should only be used in scenarios where async access to uiSettings is
 * not possible.
 */
export type GetConfigFn = <T = any>(key: string, defaultOverride?: T) => T;
