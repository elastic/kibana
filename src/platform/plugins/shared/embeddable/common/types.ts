/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type {
  PersistableStateService,
  PersistableState,
  PersistableStateDefinition,
} from '@kbn/kibana-utils-plugin/common';
import type { Type } from '@kbn/config-schema';
import type { SavedObject } from '@kbn/core/server';

export type EmbeddableStateWithType = {
  enhancements?: SerializableRecord;
  type: string;
};

export interface EmbeddableRegistryDefinition<
  P extends EmbeddableStateWithType = EmbeddableStateWithType
> extends PersistableStateDefinition<P> {
  id: string;
}

export type EmbeddablePersistableStateService = PersistableStateService<EmbeddableStateWithType>;

export type SavedObjectAttributesWithReferences<SavedObjectAttributes> = Pick<
  SavedObject<SavedObjectAttributes>,
  'attributes' | 'references'
>;

export type VersionableEmbeddableObject<SOAttributes, ItemAttributes> = {
  itemSchema?: Type<ItemAttributes>;
  savedObjectToItem?: (
    savedObject: SavedObjectAttributesWithReferences<SOAttributes>
  ) => ItemAttributes;
  itemToSavedObject?: (item: ItemAttributes) => SavedObjectAttributesWithReferences<SOAttributes>;
};

export type EmbeddableContentManagementDefinition = {
  id: string;
  versions: { 1: VersionableEmbeddableObject<any, any> } & Record<
    number,
    VersionableEmbeddableObject<any, any>
  >;
  latestVersion: number;
};

export type EmbeddableContentManagementService = {
  getEmbeddableMigrationDefinition: (id: string) => EmbeddableContentManagementDefinition;
};

export interface CommonEmbeddableStartContract {
  getEmbeddableFactory?: (
    embeddableFactoryId: string
  ) => PersistableState & { isContainerType: boolean };
  getEnhancement: (enhancementId: string) => PersistableState;
}
