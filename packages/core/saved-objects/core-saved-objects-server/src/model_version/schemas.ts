/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ObjectType } from '@kbn/config-schema';

/**
 * @public
 * @remark Currently unimplemented and unused.
 */
export type SavedObjectModelVersionCreateSchema = ObjectType;

/**
 * The schemas associated with this model version.
 *
 * @public
 * @remark Currently unimplemented and unused.
 */
export interface SavedObjectsModelVersionSchemaDefinitions {
  create?: SavedObjectModelVersionCreateSchema;
}
