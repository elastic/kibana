/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { HashedItemStore } from './hashed_item_store';
export { HashedItemStore };
export const hashedItemStore = new HashedItemStore(window.sessionStorage);
