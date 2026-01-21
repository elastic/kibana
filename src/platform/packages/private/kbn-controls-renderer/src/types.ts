/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlsGroupState } from '@kbn/controls-schemas';
import type { PinnedControlLayoutState } from '@kbn/controls-schemas/src/types';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasSerializedChildState, PresentationContainer } from '@kbn/presentation-containers';
import type {
  PublishesDisabledActionIds,
  PublishesUnifiedSearch,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { BehaviorSubject } from 'rxjs';

type ControlState = ControlsGroupState[number];
export type ControlPanelState = Pick<ControlState, 'width' | 'grow'> & { order: number };

export interface ControlRendererServices {
  uiActions: UiActionsStart;
}

export interface ControlsLayout {
  controls: {
    [id: string]: PinnedControlLayoutState;
  };
}

export interface PublishesControlsLayout {
  layout$: BehaviorSubject<ControlsLayout>;
}

export type ControlsRendererParentApi = Pick<
  PresentationContainer,
  'children$' | 'addNewPanel' | 'replacePanel'
> &
  Partial<PublishesUnifiedSearch> &
  PublishesViewMode &
  HasSerializedChildState<object> &
  Partial<PublishesDisabledActionIds> & {
    registerChildApi: (api: DefaultEmbeddableApi) => void;
    layout$: BehaviorSubject<ControlsLayout>;
    isCompressed?: () => boolean;
  };

export interface HasPrependWrapperRef {
  prependWrapperRef: React.RefObject<HTMLDivElement>;
}
