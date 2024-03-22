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
  method: SOToEmbeddable<TSavedObjectAttributes>;
  savedObjectMetaData: SavedObjectMetaData;
};

const registry: Map<string, ReactEmbeddableSavedObject<any>> = new Map();

export const registerReactEmbeddableSavedObject = <TSavedObjectAttributes extends FinderAttributes>(
  type: string,
  method: SOToEmbeddable<TSavedObjectAttributes>,
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

  registry.set(type, { method, savedObjectMetaData });
};

export const getReactEmbeddableSavedObjects = <
  TSavedObjectAttributes extends FinderAttributes
>() => {
  return registry.entries() as IterableIterator<
    [string, ReactEmbeddableSavedObject<TSavedObjectAttributes>]
  >;
};

export const getReactEmbeddableSavedObject = (type: string) => {
  return registry.get(type);
};
