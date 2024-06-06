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
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import {
  apiPublishesDataViews,
  apiPublishesFilters,
  PublishesDataViews,
  PublishesFilters,
  PublishingSubject,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';

import { EuiFlexGroup } from '@elastic/eui';
import { ControlRenderer } from '../control_renderer';
import { DefaultControlApi } from '../types';
import { openEditControlGroupFlyout } from './open_edit_control_group_flyout';
import { deserializeControlGroup, serializeControlGroup } from './serialization_utils';
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
    ControlGroupApi,
    ControlGroupRuntimeState
  > = {
    type: CONTROL_GROUP_TYPE,
    deserializeState: (state) => deserializeControlGroup(state),
    buildEmbeddable: async (initialState, buildApi, uuid, parentApi, setApi) => {
      const {
        initialChildControlState: childControlState,
        defaultControlGrow,
        defaultControlWidth,
        labelPosition,
        chainingSystem,
        showApplySelections: initialShowApply,
        ignoreParentSettings: initialParentSettings,
      } = initialState;

      const children$ = new BehaviorSubject<{ [key: string]: DefaultControlApi }>({});
      const filters$ = new BehaviorSubject<Filter[] | undefined>([]);
      const dataViews = new BehaviorSubject<DataView[] | undefined>(undefined);
      const chainingSystem$ = new BehaviorSubject<ControlGroupChainingSystem>(chainingSystem);
      const showApplySelections = new BehaviorSubject<boolean | undefined>(initialShowApply);
      const ignoreParentSettings = new BehaviorSubject<ParentIgnoreSettings | undefined>(
        initialParentSettings
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
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);

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

      const controlOrder = new BehaviorSubject<Array<{ id: string; order: number; type: string }>>(
        Object.keys(childControlState)
          .map((key) => ({
            id: key,
            order: childControlState[key].order,
            type: childControlState[key].type,
          }))
          .sort((a, b) => (a.order > b.order ? 1 : -1))
      );
      const api = setApi({
        unsavedChanges,
        resetUnsavedChanges: () => {
          // TODO: Implement this
        },
        snapshotRuntimeState: () => {
          // TODO: Remove this if it ends up being unnecessary
          return {} as unknown as ControlGroupSerializedState;
        },
        dataLoading: dataLoading$,
        children$: children$ as PublishingSubject<{
          [key: string]: unknown;
        }>,
        onEdit: async () => {
          openEditControlGroupFlyout(
            api,
            {
              chainingSystem: chainingSystem$,
              labelPosition: labelPosition$,
              showApplySelections,
              ignoreParentSettings,
            },
            { core: services.core }
          );
        },
        isEditingEnabled: () => true,
        getTypeDisplayName: () =>
          i18n.translate('controls.controlGroup.displayName', {
            defaultMessage: 'Controls',
          }),
        getSerializedStateForChild: (childId) => {
          return { rawState: childControlState[childId] };
        },
        serializeState: () => {
          return serializeControlGroup(
            children$.getValue(),
            controlOrder.getValue().map(({ id }) => id),
            {
              labelPosition: labelPosition$.getValue(),
              chainingSystem: chainingSystem$.getValue(),
              showApplySelections: showApplySelections.getValue(),
              ignoreParentSettings: ignoreParentSettings.getValue(),
            }
          );
        },
        getPanelCount: () => {
          return (Object.keys(children$.getValue()) ?? []).length;
        },
        addNewPanel: (panel) => {
          // TODO: Add a new child control
          return Promise.resolve(undefined);
        },
        removePanel: (panelId) => {
          // TODO: Remove a child control
        },
        replacePanel: async (panelId, newPanel) => {
          // TODO: Replace a child control
          return Promise.resolve(panelId);
        },
        grow,
        width,
        filters$,
        dataViews,
        labelPosition: labelPosition$,
      });

      /**
       * Subscribe to all children's output filters, combine them, and output them
       * TODO: If `showApplySelections` is true, publish to "unpublishedFilters" instead
       * and only output to filters$ when the apply button is clicked.
       *       OR
       *       Always publish to "unpublishedFilters" and publish them manually on click
       *       (when `showApplySelections` is true) or after a small debounce (when false)
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

      /** Subscribe to all children's output data views, combine them, and output them */
      const childDataViewsSubscription = combineCompatibleChildrenApis<
        PublishesDataViews,
        DataView[]
      >(api, 'dataViews', apiPublishesDataViews, []).subscribe((newDataViews) =>
        dataViews.next(newDataViews)
      );

      return {
        api,
        Component: (props, test) => {
          const controlsInOrder = useStateFromPublishingSubject(controlOrder);

          useEffect(() => {
            return () => {
              outputFiltersSubscription.unsubscribe();
              childDataViewsSubscription.unsubscribe();
            };
          }, []);

          return (
            <EuiFlexGroup className={'controlGroup'} alignItems="center" gutterSize="s" wrap={true}>
              {controlsInOrder.map(({ id, type }) => (
                <ControlRenderer
                  key={uuid}
                  maybeId={id}
                  type={type}
                  getParentApi={() => api}
                  onApiAvailable={(controlApi) => {
                    children$.next({
                      ...children$.getValue(),
                      [controlApi.uuid]: controlApi,
                    });
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
