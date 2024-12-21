/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PresentationContainer, apiIsPresentationContainer } from '@kbn/presentation-containers';
import {
  HasParentApi,
  HasType,
  HasUniqueId,
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasType,
  apiHasUniqueId,
  apiIsOfType,
} from '@kbn/presentation-publishing';
import { CONTROL_GROUP_TYPE } from '../../common';
import { isClearableControl, type CanClearSelections } from '../types';

type ClearControlActionApi = HasType &
  HasUniqueId &
  CanClearSelections &
  HasParentApi<PresentationContainer & HasType>;

export const compatibilityCheck = (api: unknown | null): api is ClearControlActionApi =>
  Boolean(
    apiHasType(api) &&
      apiHasUniqueId(api) &&
      isClearableControl(api) &&
      apiHasParentApi(api) &&
      apiCanAccessViewMode(api.parentApi) &&
      apiIsOfType(api.parentApi, CONTROL_GROUP_TYPE) &&
      apiIsPresentationContainer(api.parentApi)
  );

export function isCompatible(api: unknown) {
  return compatibilityCheck(api);
}
