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
 * Conforms to the Elastic API version specification for public APIs as a date string formatted as YYYY-MM-DD.
 *
 * @experimental
 */
export type ApiVersion = string;

/** @internal */
export const ELASTIC_HTTP_VERSION_HEADER = 'elastic-api-version' as const;
