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
import { DASHBOARD_LINK_TYPE, LinksAttributes } from '../content_management';

export function extractReferences({
  attributes,
  references = [],
}: {
  attributes: LinksAttributes;
  references?: Reference[];
}) {
  if (!attributes.links) {
    return { attributes, references };
  }

  const { links } = attributes;
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
    attributes: {
      ...attributes,
      links: newLinks,
    },
    references: references.concat(extractedReferences),
  };
}

function findReference(targetName: string, references: Reference[]) {
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
  attributes: LinksAttributes;
  references: Reference[];
}) {
  if (!attributes.links) {
    return { attributes };
  }

  const { links } = attributes;
  links.forEach((link) => {
    if (link.type === DASHBOARD_LINK_TYPE && link.destinationRefName) {
      const reference = findReference(link.destinationRefName, references);
      link.destination = reference.id;
      delete link.destinationRefName;
    }
  });

  return {
    attributes: {
      ...attributes,
      links,
    },
  };
}
