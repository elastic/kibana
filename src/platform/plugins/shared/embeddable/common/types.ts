/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Version } from '@kbn/object-versioning';
import type { SerializableRecord } from '@kbn/utility-types';
import type {
  PersistableStateService,
  PersistableState,
  PersistableStateDefinition,
} from '@kbn/kibana-utils-plugin/common';
import type { ObjectMigrationDefinition } from '@kbn/object-versioning';

export type EmbeddableStateWithType = {
  enhancements?: SerializableRecord;
  type: string;
};

export interface EmbeddableRegistryDefinition<
  P extends EmbeddableStateWithType = EmbeddableStateWithType
> extends PersistableStateDefinition<P> {
  id: string;
  version?: Version;
  getEmbeddableMigrationDefinition?: () => ObjectMigrationDefinition;
}

export type EmbeddablePersistableStateService = PersistableStateService<EmbeddableStateWithType>;

export interface CommonEmbeddableStartContract {
  getEmbeddableFactory?: (
    embeddableFactoryId: string
  ) => PersistableState & { isContainerType: boolean };
  getEnhancement: (enhancementId: string) => PersistableState;
}
