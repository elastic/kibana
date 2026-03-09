/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject, SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { Reference } from '@kbn/content-management-utils/src/types';
import { omit } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { LinksItem } from '../../../../common/content_management';
import type { DashboardLink, ExternalLink, Link, LinksState, StoredLinksState } from './types';
import {
  extractReferences,
  injectReferences,
} from '../../../../common/embeddable/transforms/references';
import { getOptions } from '../../../../common/embeddable/transforms/get_options';

type PartialSavedObject<T> = Omit<SavedObject<Partial<T>>, 'references'> & {
  references: SavedObjectReference[] | undefined;
};

interface PartialLinksItem {
  attributes: Partial<LinksItem['attributes']>;
  references: SavedObjectReference[] | undefined;
}

export function savedObjectToItem(
  savedObject: SavedObject<StoredLinksState> | PartialSavedObject<StoredLinksState>
): LinksItem | PartialLinksItem {
  const { references, attributes, ...rest } = savedObject;

  const links = injectReferences(
    transformOrderedLinks(attributes.links ?? []) as StoredLinksState['links'],
    savedObject.references
  );

  return {
    ...rest,
    attributes: {
      ...attributes,
      links: links.map(
        (link) =>
          ({
            ...link,
            ...(link.options && { options: getOptions(link.type, link.options) }),
          } as DashboardLink | ExternalLink)
      ),
    },
    references: (references ?? []).filter(({ type }) => type === 'tag'),
  };
}

export function itemToAttributes(state: LinksState): {
  attributes: StoredLinksState;
  references: Reference[];
} {
  const transformedLinks = transformOrderedLinks(state.links ?? []).map((link) => ({
    id: link.id ?? uuidv4(),
  })) as LinksState['links'];
  const { links, references } = extractReferences(transformedLinks ?? []);
  return {
    attributes: {
      ...state,
      links,
    },
    references,
  };
}

// 9.3.0 state stored links with an `order` property instead of deriving their
// order from their array position
const transformOrderedLinks = (
  links: Array<Link & { order?: number }> | StoredLinksState['links']
) =>
  links
    .sort((linkA, linkB) => {
      return (linkA.order ?? 0) - (linkB.order ?? 0);
    })
    .map((link) => omit(link, 'order'));
