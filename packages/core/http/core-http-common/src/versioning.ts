/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * A Kibana HTTP API version
 *
 * @note
 * For public APIs: conforms to the Elastic API version specification APIs as a date string formatted as YYYY-MM-DD.
 *
 * @note
 * For internal APIs: follow the convention of monotonic increasing integers.
 *
 * @experimental
 */
export type ApiVersion = string;

/** @internal */
export const ELASTIC_HTTP_VERSION_HEADER = 'elastic-api-version' as const;
