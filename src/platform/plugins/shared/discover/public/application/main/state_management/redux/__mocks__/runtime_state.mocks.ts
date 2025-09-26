/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ScopedDiscoverEBTManager } from '../../../../../ebt_manager';
import type { ConnectedCustomizationService } from '../../../../../customizations';
import type { ScopedProfilesManager } from '../../../../../context_awareness';
import type { DiscoverStateContainer } from '../../discover_state';
import {
  createRuntimeStateManager,
  type ReactiveTabRuntimeState,
  type RuntimeStateManager,
  type UnifiedHistogramConfig,
} from '../runtime_state';

export function getTabRuntimeStateMock(
  attrs: Partial<ReactiveTabRuntimeState> = {}
): ReactiveTabRuntimeState {
  return {
    stateContainer$: new BehaviorSubject<DiscoverStateContainer | undefined>(undefined),
    customizationService$: new BehaviorSubject<ConnectedCustomizationService | undefined>(
      undefined
    ),
    unifiedHistogramConfig$: new BehaviorSubject<UnifiedHistogramConfig>({
      layoutPropsMap: {},
    }),
    scopedProfilesManager$: new BehaviorSubject<ScopedProfilesManager>(
      {} as unknown as ScopedProfilesManager
    ),
    scopedEbtManager$: new BehaviorSubject<ScopedDiscoverEBTManager>(
      {} as unknown as ScopedDiscoverEBTManager
    ),
    currentDataView$: new BehaviorSubject<DataView | undefined>(undefined),
    ...attrs,
  };
}

export function getRuntimeStateManagerMock(
  attrs: Partial<RuntimeStateManager> = {}
): RuntimeStateManager {
  const runtimeStateManager = createRuntimeStateManager();

  return {
    ...runtimeStateManager,
    ...attrs,
  };
}
