/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PinnedControlLayoutState } from '@kbn/controls-schemas';
import {
  type IsPinnable,
  type PresentationContainer,
  type CanPinPanels,
  apiCanBePinned,
  apiCanPinPanels,
  apiHasParentApi,
  apiHasUniqueId,
  type HasParentApi,
  type HasType,
  type HasUniqueId,
} from '@kbn/presentation-publishing';

export type PinnableControlApi = HasType &
  HasUniqueId &
  IsPinnable &
  HasParentApi<PinnableControlParentApi>;

export type PinnableControlParentApi = PresentationContainer &
  HasType &
  CanPinPanels & {
    getLayout: (id: string) => PinnedControlLayoutState;
    setLayout: (id: string, layout: PinnedControlLayoutState) => void;
  };

// This check needs to be a separate function in order for typescript to type the parentApi correctly
const apiIsPinnableControlParentApi = (
  parentApi: unknown | null
): parentApi is PinnableControlParentApi =>
  apiCanPinPanels(parentApi) &&
  typeof (parentApi as PinnableControlParentApi).getLayout === 'function' &&
  typeof (parentApi as PinnableControlParentApi).setLayout === 'function';

export const apiIsPinnableControlApi = (api: unknown | null): api is PinnableControlApi =>
  Boolean(
    apiHasUniqueId(api) &&
      apiCanBePinned(api) &&
      apiHasParentApi(api) &&
      apiIsPinnableControlParentApi(api.parentApi) &&
      api.parentApi.panelIsPinned(api.uuid)
  );
