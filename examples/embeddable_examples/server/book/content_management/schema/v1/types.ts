/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf } from '@kbn/config-schema';
import { bookSchema, bookSearchOptionsSchema } from './v1';

export type BookSearchOptions = TypeOf<typeof bookSearchOptionsSchema>;

/*
 * Defines Book shape from CRUD APIs
 * Use BookState when interacting with Book in client
 */
export type BookState = TypeOf<typeof bookSchema>;
