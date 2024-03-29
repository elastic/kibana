/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { PresentationContainer } from '@kbn/presentation-containers';
import { FinderAttributes, SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { SavedObjectMetaData } from '@kbn/saved-objects-finder-plugin/public';

type SOToEmbeddable<TSavedObjectAttributes extends FinderAttributes = FinderAttributes> = (
  container: PresentationContainer,
  savedObject: SavedObjectCommon<TSavedObjectAttributes>
) => void;

export type ReactEmbeddableSavedObject<
  TSavedObjectAttributes extends FinderAttributes = FinderAttributes
> = {
  onAdd: SOToEmbeddable<TSavedObjectAttributes>;
  savedObjectMetaData: SavedObjectMetaData;
};

const registry: Map<string, ReactEmbeddableSavedObject<any>> = new Map();

/**
 * Register an embeddable API saved object with the Add from library flyout.
 *
 * @example
 * registerReactEmbeddableSavedObject<MapsByReferenceInput>(
 *  MAP_EMBEDDABLE_NAME,
 *  (container, savedObject) => {
 *    container.addNewPanel({
 *      panelType: MAP_EMBEDDABLE_NAME,
 *      initialState: savedObject.attributes,
 *    });
 *    }, {
 *     name: APP_NAME,
 *     type: MAP_SAVED_OBJECT_TYPE,
 *     getIconForSavedObject: () => APP_ICON,
 *   });
 */
export const registerReactEmbeddableSavedObject = <TSavedObjectAttributes extends FinderAttributes>(
  type: string,
  onAdd: SOToEmbeddable<TSavedObjectAttributes>,
  savedObjectMetaData: SavedObjectMetaData
) => {
  if (registry.has(type)) {
    throw new Error(
      i18n.translate('embeddableApi.embeddableSavedObjectRegistry.keyAlreadyExistsError', {
        defaultMessage: `Embeddable saved object type {type} already exists`,
        values: { type },
      })
    );
  }

  registry.set(type, { onAdd, savedObjectMetaData });
};

export const getReactEmbeddableSavedObjects = <
  TSavedObjectAttributes extends FinderAttributes
>() => {
  return registry.entries() as IterableIterator<
    [string, ReactEmbeddableSavedObject<TSavedObjectAttributes>]
  >;
};
