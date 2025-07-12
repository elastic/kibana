/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/server';
import { EmbeddableRegistryDefinition } from '@kbn/embeddable-plugin/server';
import { CONTROLS_GROUP_TYPE } from '@kbn/controls-constants';
import {
  createControlGroupExtract,
  createControlGroupInject,
  migrations,
} from './control_group_persistable_state';
import { controlGroupTelemetry } from './control_group_telemetry';

export const controlGroupContainerPersistableStateServiceFactory = (
  persistableStateService: EmbeddablePersistableStateService
): EmbeddableRegistryDefinition => {
  return {
    id: CONTROLS_GROUP_TYPE,
    extract: createControlGroupExtract(persistableStateService),
    inject: createControlGroupInject(persistableStateService),
    telemetry: controlGroupTelemetry,
    migrations,
  };
};
