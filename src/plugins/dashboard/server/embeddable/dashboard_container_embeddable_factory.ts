/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  EmbeddablePersistableStateService,
  EmbeddableRegistryDefinition,
} from 'src/plugins/embeddable/common';
import {
  createExtract,
  createInject,
} from '../../common/embeddable/dashboard_container_persistable_state';

export const dashboardPersistableStateServiceFactory = (
  persistableStateService: EmbeddablePersistableStateService
): EmbeddableRegistryDefinition => {
  return {
    id: 'dashboard',
    extract: createExtract(persistableStateService),
    inject: createInject(persistableStateService),
  };
};
