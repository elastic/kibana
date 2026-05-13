/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DefaultEmbeddableApi, EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { EmbeddableApiRegistration } from '@kbn/embeddable-plugin/public/react_embeddable_system/types';

export const getMockedFinalizeApi =
  <
    StateType extends object = object,
    ApiType extends DefaultEmbeddableApi<StateType> = DefaultEmbeddableApi<StateType>
  >(
    uuid: string,
    factory: EmbeddableFactory<StateType, ApiType>,
    parentApi?: Partial<DashboardApi>
  ) =>
  (api: EmbeddableApiRegistration<StateType, ApiType>) => {
    return {
      ...api,
      uuid,
      parentApi,
      type: factory.type,
    } as ApiType;
  };
