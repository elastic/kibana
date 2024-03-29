/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common';
import { EmbeddableRegistryDefinition } from '@kbn/embeddable-plugin/server';
import { CONTROL_GROUP_TYPE } from '../../common';
import {
  createControlGroupExtract,
  createControlGroupInject,
  migrations,
} from '../../common/control_group/control_group_persistable_state';
import { controlGroupTelemetry } from './control_group_telemetry';

export const controlGroupContainerPersistableStateServiceFactory = (
  persistableStateService: EmbeddablePersistableStateService
): EmbeddableRegistryDefinition => {
  return {
    id: CONTROL_GROUP_TYPE,
    extract: createControlGroupExtract(persistableStateService),
    inject: createControlGroupInject(persistableStateService),
    telemetry: controlGroupTelemetry,
    migrations,
  };
};
