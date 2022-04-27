/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import type { SavedObjectsClientContract } from '@kbn/core/public';
import type { RelinkSimpleSavedObject, RelinkSavedObjectMeta } from './types';

/** @public **/
export const shouldShowRelinkSavedObjectError = (
  e: Error,
  savedObjectType: string
): e is SavedObjectNotFound =>
  e instanceof SavedObjectNotFound && e.savedObjectType === savedObjectType;

/** @public **/
export const getRelinkSavedObjectErrorMessage = (meta: RelinkSavedObjectMeta) =>
  i18n.translate('visualizations.relinkSavedObject.error', {
    defaultMessage: 'Could not locate that {type} (id: {id})',
    values: {
      id: meta.id,
      type: meta.name ?? meta.type,
    },
  });

/** @internal **/
export const relinkSavedObject = async (
  savedObject: RelinkSimpleSavedObject,
  missedSavedObjectId: string,
  selectedSavedObjectId: string,
  services: { savedObjectsClient: SavedObjectsClientContract }
) =>
  services.savedObjectsClient.create(savedObject.type, savedObject.attributes, {
    id: savedObject.id,
    overwrite: true,
    references: (savedObject.references ?? []).map((item) => {
      if (item.id === missedSavedObjectId) {
        return {
          ...item,
          id: selectedSavedObjectId,
        };
      }
      return item;
    }),
  });

/** @internal **/
export const calcCountOfMissedSavedObjects = (
  { type, id }: RelinkSavedObjectMeta,
  references: RelinkSimpleSavedObject['references']
) => (references || []).filter((item) => item.type === type && item.id === id).length;
