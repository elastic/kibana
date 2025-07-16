/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject, SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import { LinksAttributes, LinksItem } from '../../../../common/content_management';
import { LinksCreateOptions, LinksSavedObjectAttributes } from './types';

type PartialSavedObject<T> = Omit<SavedObject<Partial<T>>, 'references'> & {
  references: SavedObjectReference[] | undefined;
};

interface PartialLinksItem {
  attributes: Partial<LinksItem['attributes']>;
  references: SavedObjectReference[] | undefined;
}

export function savedObjectToItem(
  savedObject: SavedObject<LinksSavedObjectAttributes>,
  partial: false
): LinksItem;

export function savedObjectToItem(
  savedObject: PartialSavedObject<LinksSavedObjectAttributes>,
  partial: true
): PartialLinksItem;

export function savedObjectToItem(
  savedObject:
    | SavedObject<LinksSavedObjectAttributes>
    | PartialSavedObject<LinksSavedObjectAttributes>,
  partial: boolean /* partial arg is used to enforce the correct savedObject type */
): LinksItem | PartialLinksItem {
  return savedObject;
}

export function itemToSavedObject(item: {
  attributes: LinksAttributes;
  references?: LinksCreateOptions['references'];
}) {
  return item as SavedObject<LinksSavedObjectAttributes>;
}
