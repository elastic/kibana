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
import { Filter } from '@kbn/es-query';
import {
  HasSaveNotification,
  HasSerializedChildState,
  PresentationContainer,
} from '@kbn/presentation-containers';
import {
  HasEditCapabilities,
  HasParentApi,
  PublishesDataLoading,
  PublishesDisabledActionIds,
  PublishesFilters,
  PublishesTimeslice,
  PublishesUnifiedSearch,
  PublishesUnsavedChanges,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { PublishesReload } from '@kbn/presentation-publishing/interfaces/fetch/publishes_reload';
import { PublishesDataViews } from '@kbn/presentation-publishing/interfaces/publishes_data_views';

import { ControlStyle, DefaultControlState, ParentIgnoreSettings } from '../../../common';
import {
  ControlGroupChainingSystem,
  ControlGroupEditorConfig,
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
  ControlPanelState,
} from '../../../common/control_group';
import { ControlFetchContext } from './control_fetch/control_fetch';

export type ControlGroupUnsavedChanges = Omit<
  ControlGroupRuntimeState,
  'initialChildControlState'
> & {
  filters: Filter[] | undefined;
};

export type ControlGroupApi = PresentationContainer &
  DefaultEmbeddableApi<ControlGroupSerializedState, ControlGroupRuntimeState> &
  PublishesFilters &
  PublishesDataViews &
  HasSerializedChildState<ControlPanelState> &
  HasEditCapabilities &
  PublishesDataLoading &
  Pick<PublishesUnsavedChanges<ControlGroupRuntimeState>, 'unsavedChanges'> &
  PublishesTimeslice &
  PublishesDisabledActionIds &
  Partial<HasParentApi<PublishesUnifiedSearch> & HasSaveNotification & PublishesReload> & {
    allowExpensiveQueries$: PublishingSubject<boolean>;
    autoApplySelections$: PublishingSubject<boolean>;
    ignoreParentSettings$: PublishingSubject<ParentIgnoreSettings | undefined>;
    labelPosition: PublishingSubject<ControlStyle>;

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

export type ControlGroupEditorState = Pick<
  ControlGroupRuntimeState,
  'chainingSystem' | 'labelPosition' | 'autoApplySelections' | 'ignoreParentSettings'
>;

export type ControlStateTransform<State extends DefaultControlState = DefaultControlState> = (
  newState: Partial<State>,
  controlType: string
) => Partial<State>;
