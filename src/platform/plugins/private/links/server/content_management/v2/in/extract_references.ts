/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { SavedObjectReference } from '@kbn/core/server';
import { LinksAttributes } from '../types';
import { DASHBOARD_LINK_TYPE } from '../../../../common/content_management/v1';
import { SavedObjectLinksAttributes } from '../../../saved_objects/schema/v1';

export function extractReferences({
  attributes,
  references = [],
}: {
  attributes: LinksAttributes;
  references?: SavedObjectReference[];
}): { attributes: SavedObjectLinksAttributes; references: SavedObjectReference[] } {
  const { links } = attributes;
  const extractedReferences: SavedObjectReference[] = [];

  const newLinks = links.map((link) => {
    if (link.type === DASHBOARD_LINK_TYPE) {
      const refName = `link_${link.id}_dashboard`;
      extractedReferences.push({
        name: refName,
        type: 'dashboard',
        id: link.destination,
      });
      return { ...omit(link, 'destination'), destinationRefName: refName };
    }
    return link;
  });

  return {
    attributes: {
      ...attributes,
      links: newLinks,
    },
    references: references.concat(extractedReferences),
  };
}
