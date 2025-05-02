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
import type { ObjectTransform } from '@kbn/object-versioning';
import type { MaybePromise } from '@kbn/utility-types';
import type { Type } from '@kbn/config-schema';

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

export type VersionableEmbeddableObject<
  SOAttributes = unknown,
  Item = unknown,
  PrevItem = unknown
> = {
  up?: ObjectTransform<PrevItem, Item>;
  down?: ObjectTransform<Item, PrevItem>;
  itemSchema?: Type<Item>;
  savedObjectToItem?: (savedObject: SOAttributes) => MaybePromise<Item>;
  itemToSavedObject?: (item: Item) => MaybePromise<SOAttributes>;
};

export type EmbeddableContentManagementDefinition = {
  id: string;
  versions: Record<number, VersionableEmbeddableObject<any, any, any>>;
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
