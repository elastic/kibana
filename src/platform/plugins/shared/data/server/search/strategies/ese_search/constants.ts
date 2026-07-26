/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This strategy is internal and should only be accessible to server-side code. We use a symbol because symbols are not
 * serializable and cannot be passed over the wire.
 * Note: This strategy does not provide authentication on behalf of the user and is subject to the same limitations as
 * `esClient.asInternalUser`. It is intended for internal use only where the server has already authenticated the user
 * through other means.
 */
export const INTERNAL_ENHANCED_ES_SEARCH_STRATEGY = Symbol('ese_internal');
