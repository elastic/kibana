/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';

import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { PublishesESQLVariables } from '@kbn/esql-variables-types';
import { Filter } from '@kbn/es-query';
import {
  HasSaveNotification,
  HasSerializedChildState,
  PresentationContainer,
} from '@kbn/presentation-containers';
import {
  HasEditCapabilities,
  HasParentApi,
  PublishesDisabledActionIds,
  PublishesFilters,
  PublishesTimeslice,
  PublishesUnifiedSearch,
  PublishesUnsavedChanges,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { PublishesReload } from '@kbn/presentation-publishing/interfaces/fetch/publishes_reload';
import { PublishesDataViews } from '@kbn/presentation-publishing/interfaces/publishes_data_views';

import {
  ControlGroupChainingSystem,
  ControlGroupEditorConfig,
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
  ControlLabelPosition,
  ControlPanelState,
  DefaultControlState,
  ParentIgnoreSettings,
} from '../../common';
import { ControlFetchContext } from './control_fetch/control_fetch';

/**
 * ----------------------------------------------------------------
 * Control group API
 * ----------------------------------------------------------------
 */

export type ControlGroupApi = PresentationContainer &
  DefaultEmbeddableApi<ControlGroupSerializedState, ControlGroupRuntimeState> &
  PublishesFilters &
  PublishesDataViews &
  PublishesESQLVariables &
  HasSerializedChildState<ControlPanelState> &
  HasEditCapabilities &
  Pick<PublishesUnsavedChanges<ControlGroupRuntimeState>, 'unsavedChanges$'> &
  PublishesTimeslice &
  PublishesDisabledActionIds &
  Partial<HasParentApi<PublishesUnifiedSearch> & HasSaveNotification & PublishesReload> & {
    allowExpensiveQueries$: PublishingSubject<boolean>;
    autoApplySelections$: PublishingSubject<boolean>;
    ignoreParentSettings$: PublishingSubject<ParentIgnoreSettings | undefined>;
    labelPosition: PublishingSubject<ControlLabelPosition>;

    asyncResetUnsavedChanges: () => Promise<void>;
    controlFetch$: (controlUuid: string) => Observable<ControlFetchContext>;
    openAddDataControlFlyout: (options?: {
      controlStateTransform?: ControlStateTransform;
      onSave?: () => void;
    }) => void;
    untilInitialized: () => Promise<void>;

    /** Public getters */
    getEditorConfig: () => ControlGroupEditorConfig | undefined;
    getLastSavedControlState: (controlUuid: string) => object;

    /** Public setters */
    setChainingSystem: (chainingSystem: ControlGroupChainingSystem) => void;
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
