/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Derives a low-cardinality page-load transaction name from a URL pathname.
 *
 * - App routes resolve to `/app/{appId}` regardless of deeper path segments.
 * - Non-app routes (e.g. `/login`) keep their pathname as-is.
 */
export declare const getPageLoadTransactionName: (pathname: string, basePath?: string) => string;
export declare const isAppPath: (pathname: string, basePath?: string) => boolean;
