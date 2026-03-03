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
import type { LinksItem } from '../../../../common/content_management';
import type { DashboardLink, ExternalLink, LinksState, StoredLinksState } from './types';
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
  const links = injectReferences(savedObject.attributes.links ?? [], savedObject.references);
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
  const { links, references } = extractReferences(state.links ?? []);
  return {
    attributes: {
      ...state,
      links,
    },
    references,
  };
}
