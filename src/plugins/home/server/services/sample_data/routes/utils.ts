/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RequestHandlerContext } from 'src/core/server';

export function getSavedObjectsClient(context: RequestHandlerContext, objectTypes: string[]) {
  const { getClient, typeRegistry } = context.core.savedObjects;
  const includedHiddenTypes = objectTypes.filter((supportedType) =>
    typeRegistry.isHidden(supportedType)
  );
  return getClient({ includedHiddenTypes });
}
