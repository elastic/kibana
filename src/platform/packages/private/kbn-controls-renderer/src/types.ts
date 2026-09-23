/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BehaviorSubject } from 'rxjs';

import type { ControlsGroupState, PinnedControlLayoutState } from '@kbn/controls-schemas';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type {
  CanIndicateRelatedChildren,
  HasSerializedChildState,
  PresentationContainer,
  PublishesDisabledActionIds,
  PublishesUnifiedSearch,
  PublishesViewMode,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';

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

export type ControlsRendererParentApi = Pick<
  PresentationContainer,
  'children$' | 'addNewPanel' | 'replacePanel' | 'removePanel'
> &
  Partial<CanIndicateRelatedChildren> &
  Partial<PublishesUnifiedSearch> &
  PublishesViewMode &
  HasSerializedChildState<object> &
  Partial<PublishesDisabledActionIds> &
  Partial<HasOptionsListSuggestionsPath> & {
    registerChildApi: (api: DefaultEmbeddableApi) => void;
    isCompressed?: () => boolean;
  };

/**
 * Lets an embedding app redirect options list suggestion requests to its own HTTP route.
 *
 * Controls fetch suggestions with the current user's Elasticsearch privileges. Apps backed by an
 * index that those privileges do not cover (for example a Kibana system index) can implement this
 * to point the controls at a route that authorizes the request itself and queries with an internal
 * user.
 */
export interface HasOptionsListSuggestionsPath {
  /** Returns the override path, or `undefined` to use the controls plugin's default route. */
  getOptionsListSuggestionsPath: () => string | undefined;
}

export const apiHasOptionsListSuggestionsPath = (
  api: unknown
): api is HasOptionsListSuggestionsPath =>
  typeof (api as HasOptionsListSuggestionsPath | undefined)?.getOptionsListSuggestionsPath ===
  'function';

export interface PublishesFocusedPanelId {
  focusedPanelId$: BehaviorSubject<string | undefined>;
}

export interface PublishesLabel {
  label$: PublishingSubject<string | undefined>;
}
