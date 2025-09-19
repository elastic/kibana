/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BehaviorSubject } from 'rxjs';

import type { ControlsGroupState } from '@kbn/controls-schemas';
import type { DashboardLayout } from '@kbn/dashboard-plugin/public/dashboard_api/layout_manager';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasSerializedChildState } from '@kbn/presentation-containers';
import type { PublishesDisabledActionIds, PublishesViewMode } from '@kbn/presentation-publishing';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';

type ControlState = ControlsGroupState['controls'][number];
export type ControlPanelState = Pick<ControlState, 'width' | 'grow'> & { order: number };

export interface ControlRendererServices {
  uiActions: UiActionsStart;
}

export type ControlsRendererParentApi = PublishesViewMode &
  HasSerializedChildState<object> &
  Partial<PublishesDisabledActionIds> & {
    registerChildApi: (api: DefaultEmbeddableApi) => void;
    layout$: BehaviorSubject<DashboardLayout>;
    getCompressed?: () => boolean;
  };
