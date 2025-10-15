/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { PublishesESQLVariables } from '@kbn/esql-types';
import type { Filter } from '@kbn/es-query';
import type {
  HasLastSavedChildState,
  HasSerializedChildState,
  PresentationContainer,
} from '@kbn/presentation-containers';
import type {
  HasEditCapabilities,
  HasParentApi,
  PublishesDisabledActionIds,
  PublishesFilters,
  PublishesTimeslice,
  PublishesUnifiedSearch,
  PublishesUnsavedChanges,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import type { PublishesReload } from '@kbn/presentation-publishing/interfaces/fetch/publishes_reload';
import type { PublishesDataViews } from '@kbn/presentation-publishing/interfaces/publishes_data_views';

import type {
  ControlsChainingSystem,
  ControlsGroupState,
  ControlsIgnoreParentSettings,
  ControlsLabelPosition,
} from '@kbn/controls-schemas';
import type {
  ControlGroupEditorConfig,
  ControlGroupRuntimeState,
  ControlPanelState,
  DefaultControlState,
} from '../../common';
import type { ControlFetchContext } from './control_fetch/control_fetch';

/**
 * ----------------------------------------------------------------
 * Control group API
 * ----------------------------------------------------------------
 */

export type ControlGroupApi = PresentationContainer &
  DefaultEmbeddableApi<ControlsGroupState> &
  PublishesFilters &
  PublishesDataViews &
  PublishesESQLVariables &
  HasSerializedChildState<ControlPanelState> &
  HasEditCapabilities &
  HasLastSavedChildState &
  PublishesTimeslice &
  PublishesDisabledActionIds &
  PublishesUnsavedChanges &
  Partial<HasParentApi<PublishesUnifiedSearch> & PublishesReload> & {
    allowExpensiveQueries$: PublishingSubject<boolean>;
    autoApplySelections$: PublishingSubject<boolean>;
    ignoreParentSettings$: PublishingSubject<ControlsIgnoreParentSettings | undefined>;
    labelPosition: PublishingSubject<ControlsLabelPosition>;
    controlFetch$: (controlUuid: string, onReload?: () => void) => Observable<ControlFetchContext>;
    openAddDataControlFlyout: (options?: {
      controlStateTransform?: ControlStateTransform;
      onSave?: () => void;
    }) => void;
    /**
     * @returns a promise which is resolved when all controls children have finished initializing.
     */
    untilInitialized: () => Promise<void>;

    /**
     * @returns a promise which is resolved when all initial selections have been initialized and published.
     */
    untilFiltersPublished: () => Promise<void>;

    /** Public getters */
    getEditorConfig: () => ControlGroupEditorConfig | undefined;

    /** Public setters */
    setChainingSystem: (chainingSystem: ControlsChainingSystem) => void;
  };

/**
 * ----------------------------------------------------------------
 * Helper types
 * ----------------------------------------------------------------
 */

export type ControlGroupUnsavedChanges = Omit<
  ControlGroupRuntimeState,
  'initialChildControlState'
> & {
  filters: Filter[] | undefined;
};

export type ControlGroupEditorState = Pick<
  ControlGroupRuntimeState,
  'chainingSystem' | 'labelPosition' | 'autoApplySelections' | 'ignoreParentSettings'
>;

export type ControlStateTransform<State extends DefaultControlState = DefaultControlState> = (
  newState: Partial<State>,
  controlType: string
) => Partial<State>;
