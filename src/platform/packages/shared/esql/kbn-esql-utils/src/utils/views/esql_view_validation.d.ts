/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const MAX_ESQL_VIEW_NAME_LENGTH = 255;
export declare const MAX_ESQL_VIEW_DESCRIPTION_LENGTH = 1000;
export declare const MAX_ESQL_VIEW_QUERY_LENGTH = 100000;
export type EsqlViewNameValidationError = 'required' | 'invalidFormat' | 'tooLong';
export declare const validateEsqlViewName: (
  name: string
) => EsqlViewNameValidationError | undefined;
