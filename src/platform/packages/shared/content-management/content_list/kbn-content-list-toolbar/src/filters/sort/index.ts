/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Only re-export the declarative `SortFilter`. The heavy `SortRenderer` is
// loaded lazily by `SortFilter` (see `./sort.tsx`); tests and any direct
// consumers import it from `./sort_renderer` directly so the declarative
// barrel does not statically pull the renderer into consumer bundles.
export { SortFilter, type SortFilterProps } from './sort';
