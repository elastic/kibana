/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlsRendererParentApi } from '@kbn/controls-renderer';
import { apiPublishesESQLVariables } from '@kbn/esql-types';
import {
  apiHasSerializedChildState,
  apiIsPresentationContainer,
  apiAppliesFilters,
  apiAppliesTimeslice,
  apiHasParentApi,
  apiPublishesViewMode,
} from '@kbn/presentation-publishing';
import type { ControlGroupRendererApi, HasEditorConfig } from './types';

export const apiHasEditorConfig = (parentApi: unknown): parentApi is HasEditorConfig => {
  return typeof (parentApi as HasEditorConfig).getEditorConfig === 'function';
};

const isControlGroupParentApi = (api: unknown): api is ControlsRendererParentApi => {
  return (
    typeof (api as ControlsRendererParentApi).registerChildApi === 'function' &&
    apiIsPresentationContainer(api) &&
    apiPublishesViewMode(api) &&
    apiHasSerializedChildState(api)
  );
};

export const isControlGroupRendererApi = (api: unknown): api is ControlGroupRendererApi => {
  // check for all non-deprecated pieces of the control group renderer API
  return (
    typeof (api as ControlGroupRendererApi).getControls === 'function' &&
    typeof (api as ControlGroupRendererApi).openAddDataControlFlyout === 'function' &&
    apiHasEditorConfig(api) &&
    apiAppliesFilters(api) &&
    apiAppliesTimeslice(api) &&
    apiPublishesESQLVariables(api) &&
    apiHasParentApi(api) &&
    isControlGroupParentApi(api.parentApi)
  );
};
