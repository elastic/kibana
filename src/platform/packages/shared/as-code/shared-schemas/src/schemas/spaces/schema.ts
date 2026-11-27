/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, spaceId, lazySchema } from '@kbn/zod';

const MAX_SPACES_COUNT = 100;

/** Array of space IDs. `*` is the sentinel for all spaces. */
export const asCodeSpacesSchema = lazySchema(() => z.array(spaceId()).max(MAX_SPACES_COUNT));
