/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectMigration } from '@kbn/core-saved-objects-server';

export const transformSetManagedDefault: SavedObjectMigration = {
  // @todo Remove when deferred migrations are publicly available.
  // @ts-expect-error
  deferred: true,
  transform: ({ managed, ...doc }) => ({ ...doc, managed: managed ?? false }),
};
