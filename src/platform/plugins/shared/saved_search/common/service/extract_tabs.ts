/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import type { SavedObjectModelUnsafeTransformFn } from '@kbn/core-saved-objects-server';
import type { TypeOf } from '@kbn/config-schema';
import type {
  SCHEMA_SEARCH_MODEL_VERSION_5,
  SCHEMA_SEARCH_MODEL_VERSION_6,
} from '../../server/saved_objects/schema';

export const extractTabsTransformFn: SavedObjectModelUnsafeTransformFn<
  TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_5>,
  TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_6>
> = (prevDoc) => {
  const attributes = extractTabs(prevDoc.attributes);
  return { document: { ...prevDoc, attributes } };
};

/**
 * Extract tab attributes into a separate array since multiple tabs are supported
 * @param attributes The previous attributes to be transformed (version 5)
 */
export const extractTabs = (
  attributes: TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_5>
): TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_6> => {
  const { title, description, ...tabAttrs } = attributes;
  const tabs = [
    {
      id: uuidv4(),
      label: `Untitled session 1`,
      attributes: tabAttrs,
    },
  ];
  return { title, description, tabs };
};
