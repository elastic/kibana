/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectConfig } from '../../../saved_objects/public';

/**
 * Extract the tag references from the object's attribute
 *
 * (`extractReferences` is used when persisting the saved object to the backend)
 */
export const extractTagReferences: Required<SavedObjectConfig>['extractReferences'] = ({
  attributes,
  references,
}) => {
  const { __tags, ...otherAttributes } = attributes;
  const tags = [...new Set(__tags as string[])] ?? [];
  return {
    attributes: otherAttributes,
    references: [
      ...references,
      ...tags.map((tagId) => ({
        id: tagId,
        type: 'tag',
        name: `tag-${tagId}`,
      })),
    ],
  };
};
