/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IconType } from '@elastic/eui';
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
 *  registerReactEmbeddableSavedObject({
 *    onAdd: (container, savedObject) => {
 *      container.addNewPanel({
 *        panelType: CONTENT_ID,
 *        initialState: savedObject.attributes,
 *      });
 *    },
 *    embeddableType: CONTENT_ID,
 *    savedObjectType: MAP_SAVED_OBJECT_TYPE,
 *    savedObjectName: i18n.translate('xpack.maps.mapSavedObjectLabel', {
 *      defaultMessage: 'Map',
 *    }),
 *    getIconForSavedObject: () => APP_ICON,
 *  });
 */
export const registerReactEmbeddableSavedObject = <
  TSavedObjectAttributes extends FinderAttributes
>({
  onAdd,
  embeddableType,
  savedObjectType,
  savedObjectName,
  getIconForSavedObject,
  getSavedObjectSubType,
  getTooltipForSavedObject,
}: {
  onAdd: SOToEmbeddable<TSavedObjectAttributes>;
  embeddableType: string;
  savedObjectType: string;
  savedObjectName: string;
  getIconForSavedObject: (savedObject: SavedObjectCommon<TSavedObjectAttributes>) => IconType;
  getSavedObjectSubType?: (savedObject: SavedObjectCommon<TSavedObjectAttributes>) => string;
  getTooltipForSavedObject?: (savedObject: SavedObjectCommon<TSavedObjectAttributes>) => string;
}) => {
  if (registry.has(embeddableType)) {
    throw new Error(
      i18n.translate('embeddableApi.embeddableSavedObjectRegistry.keyAlreadyExistsError', {
        defaultMessage: `Embeddable type {embeddableType} already exists in the registry.`,
        values: { embeddableType },
      })
    );
  }

  registry.set(embeddableType, {
    onAdd,
    savedObjectMetaData: {
      name: savedObjectName,
      type: savedObjectType,
      getIconForSavedObject,
      getTooltipForSavedObject,
      getSavedObjectSubType,
    },
  });
};

export const getReactEmbeddableSavedObjects = <
  TSavedObjectAttributes extends FinderAttributes
>() => {
  return registry.entries() as IterableIterator<
    [string, ReactEmbeddableSavedObject<TSavedObjectAttributes>]
  >;
};
