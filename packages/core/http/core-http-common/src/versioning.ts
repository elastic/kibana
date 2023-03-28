/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * A Kibana HTTP API version
 * @note assumption that version will be monotonically increasing number where: version > 0.
 * @experimental
 */
export type ApiVersion = `${number}`;

/** @internal */
export const ELASTIC_HTTP_VERSION_HEADER = 'elastic-api-version' as const;
