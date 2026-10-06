/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
export declare function getQueryLanguage(query: Query | AggregateQuery | undefined): string;
export declare function getQueryString(query: Query | AggregateQuery | undefined): string;
export declare function getQueryStringCharCount(queryString: string): number;
export declare function getQueryStringLineCount(queryString: string): number;
