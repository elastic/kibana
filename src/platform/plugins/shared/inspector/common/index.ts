/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The `common/index` file re-exports types and interfaces from
 * the `@kbn/inspector-common` package.
 *
 * Please do not export any static code from this file. All static code
 * should be exported from the `@kbn/inspector-common` package.
 *
 * Types can be exported from this file, but plugins and packages may prefer to
 * import them from the `@kbn/inspector-common` packages to avoid circular
 * graph issues.
 */

export type {
  Adapters,
  Request,
  RequestStatistic,
  RequestStatistics,
  RequestResponder,
} from '@kbn/inspector-common';
export { RequestAdapter, RequestStatus } from '@kbn/inspector-common';
