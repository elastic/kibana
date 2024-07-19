/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';

import { EuiFlexGroup } from '@elastic/eui';
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
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import {
  apiPublishesDataViews,
  apiPublishesFilters,
  apiPublishesTimeslice,
  PublishesDataViews,
  PublishesFilters,
  PublishesTimeslice,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';

import { ControlRenderer } from '../control_renderer';
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
        labelPosition,
        chainingSystem,
        autoApplySelections,
        ignoreParentSettings,
      } = initialState;

      const controlsManager = initControlsManager(initialChildControlState);
      const autoApplySelections$ = new BehaviorSubject<boolean>(autoApplySelections);
      const timeslice$ = new BehaviorSubject<[number, number] | undefined>(undefined);
      const filters$ = new BehaviorSubject<Filter[] | undefined>([]);
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
        labelPosition ?? DEFAULT_CONTROL_STYLE // TODO: Rename `DEFAULT_CONTROL_STYLE`
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
        controlFetch$: (controlUuid: string) =>
          controlFetch$(
            chaining$(
              controlUuid,
              chainingSystem$,
              controlsManager.controlsInOrder$,
              controlsManager.getControlApi
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
        filters$,
        dataViews,
        labelPosition: labelPosition$,
        timeslice$,
      });

      /**
       * Subscribe to all children's output filters, combine them, and output them
       * TODO: If `autoApplySelections` is false, publish to "unpublishedFilters" instead
       * and only output to filters$ when the apply button is clicked.
       *       OR
       *       Always publish to "unpublishedFilters" and publish them manually on click
       *       (when `autoApplySelections` is false) or after a small debounce (when false)
       *       See: https://github.com/elastic/kibana/pull/182842#discussion_r1624929511
       * - Note: Unsaved changes of control group **should** take into consideration the
       *         output filters,  but not the "unpublishedFilters"
       */
      const outputFiltersSubscription = combineCompatibleChildrenApis<PublishesFilters, Filter[]>(
        api,
        'filters$',
        apiPublishesFilters,
        []
      ).subscribe((newFilters) => filters$.next(newFilters));

      const childrenTimesliceSubscription = combineCompatibleChildrenApis<
        PublishesTimeslice,
        [number, number] | undefined
      >(
        api,
        'timeslice$',
        apiPublishesTimeslice,
        undefined,
        // flatten method
        (values) => {
          // control group should never allow multiple timeslider controls
          // returns first timeslider control value
          return values.length === 0 ? undefined : values[0];
        }
      ).subscribe((timeslice) => {
        timeslice$.next(timeslice);
      });

      /** Subscribe to all children's output data views, combine them, and output them */
      const childDataViewsSubscription = combineCompatibleChildrenApis<
        PublishesDataViews,
        DataView[]
      >(api, 'dataViews', apiPublishesDataViews, []).subscribe((newDataViews) =>
        dataViews.next(newDataViews)
      );

      return {
        api,
        Component: () => {
          const controlsInOrder = useStateFromPublishingSubject(controlsManager.controlsInOrder$);

          useEffect(() => {
            return () => {
              outputFiltersSubscription.unsubscribe();
              childDataViewsSubscription.unsubscribe();
              childrenTimesliceSubscription.unsubscribe();
            };
          }, []);

          return (
            <EuiFlexGroup className={'controlGroup'} alignItems="center" gutterSize="s" wrap={true}>
              {controlsInOrder.map(({ id, type }) => (
                <ControlRenderer
                  key={id}
                  uuid={id}
                  type={type}
                  getParentApi={() => api}
                  onApiAvailable={(controlApi) => {
                    controlsManager.setControlApi(id, controlApi);
                  }}
                />
              ))}
            </EuiFlexGroup>
          );
        },
      };
    },
  };

  return controlGroupEmbeddableFactory;
};
