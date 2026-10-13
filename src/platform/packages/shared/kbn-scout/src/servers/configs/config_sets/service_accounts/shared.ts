/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Service accounts are on by default outside serverless, but off by default on serverless. The
 * serverless configs need this flag to reach the feature, and the stateful config keeps it so
 * every config in the set boots the same way.
 */
export const serviceAccountsServerArgs = ['--xpack.security.serviceAccounts.enabled=true'];
