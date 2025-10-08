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
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasSerializedChildState, PresentationContainer } from '@kbn/presentation-containers';
import type {
  PublishesDisabledActionIds,
  PublishesUnifiedSearch,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';

type ControlState = ControlsGroupState['controls'][number];
export type ControlPanelState = Pick<ControlState, 'width' | 'grow'> & { order: number };

export interface ControlRendererServices {
  uiActions: UiActionsStart;
}

/**
 * TODO: I added this to avoid circular dependencies; however, we should probably clean up the typings
 * expected here so that `controls-renderer` is less depenedent on Dashboard types. i.e. it shouldn't
 * need all the layout information, just controls.
 */
export interface TemporaryControlsLayout {
  panels: any;
  sections: any;
  controls: {
    [id: string]: Pick<ControlsGroupState['controls'][number], 'width' | 'grow' | 'type'> & {
      order: number;
    };
  };
}

export type ControlsRendererParentApi = Pick<
  PresentationContainer,
  'children$' | 'addNewPanel' | 'replacePanel'
> &
  Partial<PublishesUnifiedSearch> &
  PublishesViewMode &
  HasSerializedChildState<object> &
  // Pick<DashboardApi, 'registerChildApi' | 'layout$'> &
  Partial<PublishesDisabledActionIds> & {
    registerChildApi: (api: DefaultEmbeddableApi) => void;
    layout$: BehaviorSubject<TemporaryControlsLayout>;
    isCompressed?: () => boolean;
  };
