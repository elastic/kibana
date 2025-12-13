/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { apiHasPrependWrapperRef, type HasPrependWrapperRef } from '@kbn/controls-renderer';
import {
  type IsPinnable,
  type PresentationContainer,
  type CanPinPanel,
  apiCanBePinned,
  apiCanPinPanel,
} from '@kbn/presentation-containers';
import {
  apiHasParentApi,
  apiHasUniqueId,
  type HasParentApi,
  type HasType,
} from '@kbn/presentation-publishing';
import type { HasUniqueId } from '@kbn/presentation-publishing';
import { apiPublishesControlsLayout, type PublishesControlsLayout } from '../types';

export type PinnableControlApi = HasType &
  HasUniqueId &
  IsPinnable &
  HasParentApi<PinnableControlParentApi> &
  HasPrependWrapperRef;

export type PinnableControlParentApi = PresentationContainer &
  HasType &
  CanPinPanel &
  PublishesControlsLayout;

// This check needs to be a separate function in order for typescript to type the parentApi correctly
const apiIsPinnableControlParentApi = (
  parentApi: unknown | null
): parentApi is PinnableControlParentApi =>
  Boolean(apiPublishesControlsLayout(parentApi) && apiCanPinPanel(parentApi));

export const apiIsPinnableControlApi = (api: unknown | null): api is PinnableControlApi =>
  Boolean(
    apiHasUniqueId(api) &&
      apiCanBePinned(api) &&
      apiHasParentApi(api) &&
      apiHasPrependWrapperRef(api) &&
      apiIsPinnableControlParentApi(api.parentApi) &&
      api.parentApi.panelIsPinned(api.uuid)
  );
