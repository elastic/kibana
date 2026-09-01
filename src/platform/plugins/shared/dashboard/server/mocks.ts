/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/server/mocks';
import { createEmbeddableStartMock } from '@kbn/embeddable-plugin/server/mocks';
import { savedObjectsTaggingMock } from '@kbn/saved-objects-tagging-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { setKibanaServices } from './kibana_services';

export const setStubKibanaServices = () => {
  const core = coreMock.createStart();
  setKibanaServices(
    core,
    {
      embeddable: createEmbeddableStartMock(),
      savedObjectsTagging: savedObjectsTaggingMock.createStartContract(),
      taskManager: taskManagerMock.createStart(),
    },
    coreMock.createPluginInitializerContext().logger.get()
  );
};
