/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PersistableStateDefinition } from '@kbn/kibana-utils-plugin/common';
import type { ObjectType } from '@kbn/config-schema';
import { EnhancementsRegistry } from '../common/enhancements/registry';
import type { EnhancementRegistryDefinition } from '../common/enhancements/types';
import type { EmbeddableTransforms } from '../common';

export interface EmbeddableSetup {
  /*
   * Use registerTransforms to register transforms and schema for an embeddable type.
   * Transforms decouple REST API state from stored state,
   * allowing embeddables to have one shape for REST APIs and another for storage.
   * Embeddable containers, such as dashboard, use transforms to convert EmbeddableState into StoreEmbeddableState and vice versa.
   * On read, transformOut is used to convert StoredEmbeddableState and inject references into EmbeddableState.
   * On write, transformIn is used to extract references and convert EmbeddableState into StoredEmbeddableState.
   */
  registerTransforms: (type: string, transforms: EmbeddableTransforms<any, any>) => void;
  registerEnhancement: (enhancement: EnhancementRegistryDefinition) => void;
  transformEnhancementsIn: EnhancementsRegistry['transformIn'];
  transformEnhancementsOut: EnhancementsRegistry['transformOut'];

  bwc: {
    registerPersistableState: (embeddableType: string, persistableState: PersistableStateDefinition) => void;
    // getAllMigrations: () => MigrateFunctionsObject;
  }
}

export type EmbeddableStart = {
  /**
   * Returns all embeddable schemas registered with registerTransforms.
   */
  getEmbeddableSchemas: () => ObjectType[];

  getTransforms: (type: string) => EmbeddableTransforms | undefined;
};
