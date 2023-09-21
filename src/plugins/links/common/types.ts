/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsResolveResponse } from '@kbn/core-saved-objects-api-server';

export type NavigationEmbeddableContentType = 'navigation_embeddable';

// TODO does this type need to be versioned?
export interface SharingSavedObjectProps {
  outcome: SavedObjectsResolveResponse['outcome'];
  aliasTargetId?: SavedObjectsResolveResponse['alias_target_id'];
  aliasPurpose?: SavedObjectsResolveResponse['alias_purpose'];
  sourceId?: string;
}
