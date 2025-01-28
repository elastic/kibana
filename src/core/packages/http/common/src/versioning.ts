/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A Kibana HTTP API version
 *
 * @note
 * For public APIs: conforms to the Elastic API version specification APIs as a date string formatted as YYYY-MM-DD.
 * Ex. 2021-01-01 -> 2022-02-02
 *
 * @note
 * For internal APIs: follow the convention of monotonic increasing integers.
 * Ex. 1 -> 2 -> 3
 *
 * @experimental
 */
export type ApiVersion = string;
