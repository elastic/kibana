/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SetupDeps, StartDeps } from '../../plugin';
import { DIRECT_FILTER_TYPE } from './constants';

export const registerDirectFilterEmbeddable = (
  embeddable: SetupDeps['embeddable'],
  startDeps: Promise<StartDeps>
) => {
  const getAllDeps = async () => {
    const [module, dataViewsService] = await Promise.all([
      import('./get_direct_filter_embeddable_factory'),
      (async () => {
        const start = await startDeps;
        return start.dataViews;
      })(),
    ]);
    return { module, dataViewsService };
  };

  embeddable.registerReactEmbeddableFactory(DIRECT_FILTER_TYPE, async () => {
    const {
      module: { getDirectFilterEmbeddableFactory },
      dataViewsService,
    } = await getAllDeps();
    return getDirectFilterEmbeddableFactory(dataViewsService);
  });

  embeddable.registerComposableFetchContextFactory(DIRECT_FILTER_TYPE, async () => {
    const {
      module: { getDirectFilterComposableFetchContextFactory },
      dataViewsService,
    } = await getAllDeps();
    return getDirectFilterComposableFetchContextFactory(dataViewsService);
  });
};
