/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Reserved key under which engine bookkeeping for the poll loop is persisted. */
export const POLL_BOOKKEEPING_KEY = '__poll';
/** Reserved key under which the author's `state` is persisted between poll calls. */
export const POLL_AUTHOR_STATE_KEY = '__authorState';
