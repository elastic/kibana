/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { PresentationContainer } from '@kbn/presentation-containers';
import { SavedObjectMetaData } from '@kbn/saved-objects-finder-plugin/public';

type SOToEmbeddable = (container: PresentationContainer, so: SavedObjectMetaData) => void;

const registry: { [key: string]: SOToEmbeddable } = {};

export const registerReactEmbeddableSavedObjectMeta = (method: SOToEmbeddable, type: string) => {
  if (registry[type] !== undefined) {
    throw new Error(
      i18n.translate('embeddableApi.embeddableSavedObjectRegistry.keyAlreadyExistsError', {
        defaultMessage: `Saved object meta for embeddable type {type} already exists`,
        values: { type },
      })
    );
  }

  registry[type] = method;
};
