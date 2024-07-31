/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import {
  ControlGroupChainingSystem,
  ControlWidth,
  CONTROL_GROUP_TYPE,
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_STYLE,
  DEFAULT_CONTROL_WIDTH,
} from '@kbn/controls-plugin/common';
import { ControlStyle, ParentIgnoreSettings } from '@kbn/controls-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { DataView } from '@kbn/data-views-plugin/common';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import {
  apiPublishesDataViews,
  PublishesDataViews,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { chaining$, controlFetch$, controlGroupFetch$ } from './control_fetch';
import { initControlsManager } from './init_controls_manager';
import { openEditControlGroupFlyout } from './open_edit_control_group_flyout';
import { deserializeControlGroup } from './serialization_utils';
import {
  ControlGroupApi,
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
  ControlGroupUnsavedChanges,
} from './types';
import { ControlGroup } from './components/control_group';
import { initSelectionsManager } from './selections_manager';

export const getControlGroupEmbeddableFactory = (services: {
  core: CoreStart;
  dataViews: DataViewsPublicPluginStart;
}) => {
  const controlGroupEmbeddableFactory: ReactEmbeddableFactory<
    ControlGroupSerializedState,
    ControlGroupRuntimeState,
    ControlGroupApi
  > = {
    type: CONTROL_GROUP_TYPE,
    deserializeState: (state) => deserializeControlGroup(state),
    buildEmbeddable: async (initialState, buildApi, uuid, parentApi, setApi) => {
      const {
        initialChildControlState,
        defaultControlGrow,
        defaultControlWidth,
        labelPosition: initialLabelPosition,
        chainingSystem,
        autoApplySelections,
        ignoreParentSettings,
      } = initialState;

      const autoApplySelections$ = new BehaviorSubject<boolean>(autoApplySelections);
      const controlsManager = initControlsManager(initialChildControlState);
      const selectionsManager = initSelectionsManager({
        ...controlsManager.api,
        autoApplySelections$,
      });
      const dataViews = new BehaviorSubject<DataView[] | undefined>(undefined);
      const chainingSystem$ = new BehaviorSubject<ControlGroupChainingSystem>(chainingSystem);
      const ignoreParentSettings$ = new BehaviorSubject<ParentIgnoreSettings | undefined>(
        ignoreParentSettings
      );
      const grow = new BehaviorSubject<boolean | undefined>(
        defaultControlGrow === undefined ? DEFAULT_CONTROL_GROW : defaultControlGrow
      );
      const width = new BehaviorSubject<ControlWidth | undefined>(
        defaultControlWidth ?? DEFAULT_CONTROL_WIDTH
      );
      const labelPosition$ = new BehaviorSubject<ControlStyle>( // TODO: Rename `ControlStyle`
        initialLabelPosition ?? DEFAULT_CONTROL_STYLE // TODO: Rename `DEFAULT_CONTROL_STYLE`
      );

      /** TODO: Handle loading; loading should be true if any child is loading */
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);

      /** TODO: Handle unsaved changes
       * - Each child has an unsaved changed behaviour subject it pushes to
       * - The control group listens to all of them (anyChildHasUnsavedChanges) and publishes its
       *   own unsaved changes if either one of its children has unsaved changes **or** one of
       *   the control group settings changed.
       * - Children should **not** publish unsaved changes based on their output filters or selections.
       *   Instead, the control group will handle unsaved changes for filters.
       */
      const unsavedChanges = new BehaviorSubject<Partial<ControlGroupUnsavedChanges> | undefined>(
        undefined
      );

      const api = setApi({
        ...controlsManager.api,
        ...selectionsManager.api,
        controlFetch$: (controlUuid: string) =>
          controlFetch$(
            chaining$(
              controlUuid,
              chainingSystem$,
              controlsManager.controlsInOrder$,
              controlsManager.api.children$
            ),
            controlGroupFetch$(ignoreParentSettings$, parentApi ? parentApi : {})
          ),
        ignoreParentSettings$,
        autoApplySelections$,
        unsavedChanges,
        resetUnsavedChanges: () => {
          // TODO: Implement this
        },
        snapshotRuntimeState: () => {
          // TODO: Remove this if it ends up being unnecessary
          return {} as unknown as ControlGroupRuntimeState;
        },
        dataLoading: dataLoading$,
        onEdit: async () => {
          openEditControlGroupFlyout(
            api,
            {
              chainingSystem: chainingSystem$,
              labelPosition: labelPosition$,
              autoApplySelections: autoApplySelections$,
              ignoreParentSettings: ignoreParentSettings$,
            },
            { core: services.core }
          );
        },
        isEditingEnabled: () => true,
        getTypeDisplayName: () =>
          i18n.translate('controls.controlGroup.displayName', {
            defaultMessage: 'Controls',
          }),
        serializeState: () => {
          const { panelsJSON, references } = controlsManager.serializeControls();
          return {
            rawState: {
              chainingSystem: chainingSystem$.getValue(),
              controlStyle: labelPosition$.getValue(), // Rename "labelPosition" to "controlStyle"
              showApplySelections: !autoApplySelections$.getValue(),
              ignoreParentSettingsJSON: JSON.stringify(ignoreParentSettings$.getValue()),
              panelsJSON,
            },
            references,
          };
        },
        grow,
        width,
        dataViews,
        labelPosition: labelPosition$,
      });

      /** Subscribe to all children's output data views, combine them, and output them */
      const childrenDataViewsSubscription = combineCompatibleChildrenApis<
        PublishesDataViews,
        DataView[]
      >(api, 'dataViews', apiPublishesDataViews, []).subscribe((newDataViews) =>
        dataViews.next(newDataViews)
      );

      return {
        api,
        Component: () => {
          const [hasUnappliedSelections, labelPosition] = useBatchedPublishingSubjects(
            selectionsManager.hasUnappliedSelections$,
            labelPosition$
          );

          useEffect(() => {
            return () => {
              selectionsManager.cleanup();
              childrenDataViewsSubscription.unsubscribe();
            };
          }, []);

          return (
            <ControlGroup
              applySelections={selectionsManager.applySelections}
              controlGroupApi={api}
              controlsManager={controlsManager}
              hasUnappliedSelections={hasUnappliedSelections}
              labelPosition={labelPosition}
            />
          );
        },
      };
    },
  };

  return controlGroupEmbeddableFactory;
};
