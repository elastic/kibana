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
import { v4 as uuidv4 } from 'uuid';
import type {
  ExternalLink,
  LinksByValueState,
  StoredDashboardLink,
  StoredLinksState,
} from '../../../server';
import {
  DASHBOARD_LINK_TYPE,
  EXTERNAL_LINK_TYPE,
  LEGACY_DASHBOARD_LINK_TYPE,
  LEGACY_EXTERNAL_LINK_TYPE,
} from '../../constants';
import type { LegacyLinkType } from '../../types';

export function transformLinksIn(links: LinksByValueState['links']) {
  const extractedReferences: Reference[] = [];

  const newLinks = links.map((link) => {
    if (link.type === DASHBOARD_LINK_TYPE && link.destination) {
      const refName = `link_${uuidv4()}_dashboard`;
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
    links: newLinks as StoredLinksState['links'],
    references: extractedReferences,
  };
}

export function transformLinksOut(
  links: StoredLinksState['links'],
  references: Reference[] = []
): LinksByValueState['links'] {
  return (links ?? []).map((link) => {
    const transformedLink = { ...link };
    // transform link types from camelCase to snake_case
    if ((transformedLink.type as LegacyLinkType) === LEGACY_DASHBOARD_LINK_TYPE) {
      transformedLink.type = DASHBOARD_LINK_TYPE;
    } else if ((transformedLink.type as LegacyLinkType) === LEGACY_EXTERNAL_LINK_TYPE) {
      transformedLink.type = EXTERNAL_LINK_TYPE;
    }

    // handle external links
    const { destinationRefName, ...rest } = transformedLink as StoredDashboardLink;
    if (transformedLink.type !== DASHBOARD_LINK_TYPE || !destinationRefName) {
      return transformedLink as ExternalLink;
    }

    // handle references for dashboard links
    const reference = references.find(({ name }) => name === destinationRefName);
    return {
      ...rest,
      destination: reference?.id ?? '',
    };
  });
}
