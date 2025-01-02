/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { PresentationContainer, apiIsPresentationContainer } from '@kbn/presentation-containers';
import {
  HasParentApi,
  HasType,
  HasUniqueId,
  PublishesViewMode,
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasType,
  apiHasUniqueId,
  apiIsOfType,
  getInheritedViewMode,
} from '@kbn/presentation-publishing';
import { CONTROL_GROUP_TYPE } from '../../common';
import { isVariablesControl, type CanClearVariables } from '../types';

type DeleteControlActionApi = HasType &
  HasUniqueId &
  CanClearVariables &
  HasParentApi<PresentationContainer & PublishesViewMode & HasType>;

export const compatibilityCheck = (api: unknown | null): api is DeleteControlActionApi =>
  Boolean(
    apiHasType(api) &&
      apiHasUniqueId(api) &&
      apiHasParentApi(api) &&
      isVariablesControl(api) &&
      apiCanAccessViewMode(api.parentApi) &&
      apiIsOfType(api.parentApi, CONTROL_GROUP_TYPE) &&
      apiIsPresentationContainer(api.parentApi)
  );

export function isCompatible(api: unknown) {
  return compatibilityCheck(api) && getInheritedViewMode(api.parentApi) === ViewMode.EDIT;
}
