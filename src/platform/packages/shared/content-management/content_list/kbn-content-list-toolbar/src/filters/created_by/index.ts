/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Only re-export the declarative `CreatedByFilter`. The heavy
// `CreatedByFilterRenderer` (which pulls in `UserFieldFilterRenderer` and
// user profile dependencies) is loaded lazily by `CreatedByFilter` (see
// `./created_by_filter.tsx`); the public toolbar entry re-exports the
// renderer from its leaf module directly for the small number of consumers
// that wire it themselves.
export { CreatedByFilter } from './created_by_filter';
