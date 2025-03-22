/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { LinksByValueSerializedState } from '../types';
import { DASHBOARD_LINK_TYPE } from '../../../../common/content_management';
import { SavedObjectLinksAttributes } from '../../../saved_objects/schema/v1';

function findReference(targetName: string, references: SavedObjectReference[]) {
  const reference = references.find(({ name }) => name === targetName);
  if (!reference) {
    throw new Error(`Could not find reference "${targetName}"`);
  }
  return reference;
}

export function injectReferences({
  attributes,
  references,
}: {
  attributes: SavedObjectLinksAttributes;
  references: SavedObjectReference[];
}): LinksByValueSerializedState {
  const { links } = attributes;
  const injectedLinks = links.map((link) => {
    if (link.type === DASHBOARD_LINK_TYPE) {
      const reference = findReference(link.destinationRefName, references);
      const { destinationRefName, ...restOfLink } = link;
      return {
        ...restOfLink,
        destination: reference.id,
      };
    }
    return link;
  });

  return {
    attributes: {
      ...attributes,
      links: injectedLinks,
    },
  };
}
