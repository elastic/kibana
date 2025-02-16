/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableRegistryItem } from '@kbn/embeddable-plugin/server';
import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import type { PersistableStateService } from '@kbn/kibana-utils-plugin/common';
import {
  createControlGroupExtract,
  createControlGroupInject,
  migrations,
} from './control_group_persistable_state';
import { controlGroupTelemetry } from './control_group_telemetry';

export const controlGroupContainerPersistableStateServiceFactory = (
  getControlsFactory: (controlFactoryId: string) => EmbeddableRegistryItem
): PersistableStateService<EmbeddableStateWithType> => {
  return {
    extract: createControlGroupExtract(getControlsFactory),
    inject: createControlGroupInject(getControlsFactory),
    telemetry: controlGroupTelemetry,
    getAllMigrations: () => migrations,
  };
};
