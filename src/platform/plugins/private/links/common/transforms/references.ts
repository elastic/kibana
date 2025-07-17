/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { omit } from 'lodash';
import { DASHBOARD_LINK_TYPE } from '../content_management';
import type { ExternalLink, LinksState } from '../../server';
import { StoredDashboardLink, StoredLinksState } from './types';

export function extractReferences({
  links,
  references = [],
}: {
  links: LinksState['links'];
  references?: Reference[];
}) {
  const extractedReferences: Reference[] = [];

  const newLinks = links.map((link) => {
    if (link.type === DASHBOARD_LINK_TYPE && link.destination) {
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
    links: newLinks,
    references: extractedReferences,
  };
}

export function injectReferences(
  links: StoredLinksState['links'],
  references: Reference[] = []
): LinksState['links'] {
  return (links ?? []).map((link) => {
    const { destinationRefName, ...rest } = link as StoredDashboardLink;
    if (link.type !== DASHBOARD_LINK_TYPE || !destinationRefName) {
      return link as ExternalLink;
    }

    const reference = references.find(({ name }) => name === destinationRefName);
    return {
      ...rest,
      destination: reference?.id ?? ''
    };
  });
}
