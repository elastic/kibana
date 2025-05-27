/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { v4 } from 'uuid';
import { CanGetEmbeddableContentManagementDefinition } from '@kbn/embeddable-plugin/common';
import { BookAttributes } from './types';
import { SAVED_BOOK_ID } from './constants';

const storage = new Storage(localStorage);

export const loadBookAttributes = async (
  embeddable: CanGetEmbeddableContentManagementDefinition,
  id: string
): Promise<BookAttributes> => {
  await new Promise((r) => setTimeout(r, 500)); // simulate load from network.
  const attributes = storage.get(id) as BookAttributes;
  const embeddableCmDefinitions =
    embeddable.getEmbeddableContentManagementDefinition(SAVED_BOOK_ID);
  const { savedObjectToItem } =
    embeddableCmDefinitions?.versions[embeddableCmDefinitions.latestVersion] ?? {};
  if (!savedObjectToItem) return attributes;
  const { attributes: transformedAttributes } = await savedObjectToItem({
    attributes,
    references: [],
  });
  return transformedAttributes;
};

export const saveBookAttributes = async (
  embeddable: CanGetEmbeddableContentManagementDefinition,
  maybeId?: string,
  attributes?: BookAttributes
): Promise<string> => {
  await new Promise((r) => setTimeout(r, 500)); // simulate save to network.
  const id = maybeId ?? v4();
  const embeddableCmDefinitions =
    embeddable.getEmbeddableContentManagementDefinition(SAVED_BOOK_ID);
  const { itemToSavedObject } =
    embeddableCmDefinitions?.versions[embeddableCmDefinitions.latestVersion] ?? {};
  if (!itemToSavedObject) {
    storage.set(id, attributes);
  } else {
    const { attributes: transformedAttributes } = await itemToSavedObject({
      attributes,
      references: [],
    });
    storage.set(id, transformedAttributes);
  }

  return id;
};
