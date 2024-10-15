/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CanAddNewPanel } from '@kbn/presentation-containers';
import { FinderAttributes, SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { SavedObjectMetaData } from '@kbn/saved-objects-finder-plugin/public';

type SOToEmbeddable<TSavedObjectAttributes extends FinderAttributes = FinderAttributes> = (
  container: CanAddNewPanel,
  savedObject: SavedObjectCommon<TSavedObjectAttributes>
) => void;

export type ReactEmbeddableSavedObject<
  TSavedObjectAttributes extends FinderAttributes = FinderAttributes
> = {
  onAdd: SOToEmbeddable<TSavedObjectAttributes>;
  savedObjectMetaData: SavedObjectMetaData;
};

const registry: Map<string, ReactEmbeddableSavedObject<any>> = new Map();

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
