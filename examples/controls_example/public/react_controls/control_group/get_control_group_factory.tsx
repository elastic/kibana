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
  DEFAULT_CONTROL_STYLE,
} from '@kbn/controls-plugin/common';
import { ControlStyle, ParentIgnoreSettings } from '@kbn/controls-plugin/public';
import { OverlayStart } from '@kbn/core/public';
import { DataView } from '@kbn/data-views-plugin/common';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import {
  apiPublishesDataViews,
  apiPublishesFilters,
  PublishesDataViews,
  PublishesFilters,
  PublishingSubject,
  StateComparators,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';

import { combineCompatibleApis } from '@kbn/presentation-containers';
import { ControlRenderer } from '../control_renderer';
import { DefaultControlApi } from '../types';
import { deserializeControlGroup, serializeControlGroup } from './serialization_utils';
import {
  ControlGroupApi,
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
  ControlsPanels,
} from './types';

export const getControlGroupEmbeddableFactory = (services: {
  overlays: OverlayStart;
  dataViews: DataViewsPublicPluginStart;
}) => {
  const controlGroupEmbeddableFactory: ReactEmbeddableFactory<
    ControlGroupSerializedState,
    ControlGroupApi,
    ControlGroupRuntimeState
  > = {
    type: CONTROL_GROUP_TYPE,
    deserializeState: (state) => deserializeControlGroup(state),
    buildEmbeddable: async (initialState, buildApi, uuid, parentApi) => {
      console.log(initialState.panels);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const grow = new BehaviorSubject<boolean>(initialState.defaultControlGrow);
      const width = new BehaviorSubject<ControlWidth>(initialState.defaultControlWidth);
      const children$ = new BehaviorSubject<{ [key: string]: DefaultControlApi }>({});
      const filters$ = new BehaviorSubject<Filter[] | undefined>([]);
      const dataViews = new BehaviorSubject<DataView[] | undefined>(undefined);
      const panels$ = new BehaviorSubject<ControlsPanels>(initialState.panels);
      const controlStyle$ = new BehaviorSubject<ControlStyle>(
        initialState.controlStyle ?? DEFAULT_CONTROL_STYLE
      );
      const chainingSystem$ = new BehaviorSubject<ControlGroupChainingSystem>(
        initialState.chainingSystem
      );
      const showApplySelections = new BehaviorSubject<boolean | undefined>(
        initialState.showApplySelections
      );
      const ignoreParentSettings = new BehaviorSubject<ParentIgnoreSettings | undefined>(
        initialState.ignoreParentSettings
      );

      const anyChildHasUnsavedChanges = new BehaviorSubject<boolean>(
        initialState.anyChildHasUnsavedChanges
      );

      // each child has an unsaved changed behaviour subject it pushes to
      // control group listens to all of them
      // any time they change, it pops it into an object

      const controlGroupComparators: StateComparators<ControlGroupRuntimeState> = {
        chainingSystem: [chainingSystem$, (value) => chainingSystem$.next(value)],
        defaultControlGrow: [grow, (value) => grow.next(value)],
        defaultControlWidth: [width, (value) => width.next(value)],
        controlStyle: [controlStyle$, (value) => controlStyle$.next(value)],
        showApplySelections: [showApplySelections, (value) => showApplySelections.next(value)],
        ignoreParentSettings: [ignoreParentSettings, (value) => ignoreParentSettings.next(value)],
        panels: [
          panels$,
          (value) => panels$.next(value),
          () => true, // each control will be responsible for handling its own unsaved changes
        ],
        anyChildHasUnsavedChanges: [
          anyChildHasUnsavedChanges,
          (value) => anyChildHasUnsavedChanges.next(value),
          () => anyChildHasUnsavedChanges.getValue(),
        ],
      };

      const api = buildApi(
        {
          dataLoading: dataLoading$,
          children$: children$ as PublishingSubject<{
            [key: string]: unknown;
          }>,
          onEdit: async () => {
            // TODO: Edit control group settings
          },
          isEditingEnabled: () => true,
          getTypeDisplayName: () =>
            i18n.translate('controls.controlGroup.displayName', {
              defaultMessage: 'Controls',
            }),
          getChildState: (childId) => {
            console.log(childId, panels$.getValue());
            return panels$.getValue()[childId];
          },
          serializeState: () => {
            return serializeControlGroup({
              panels: panels$.getValue(),
              controlStyle: controlStyle$.getValue(),
              chainingSystem: chainingSystem$.getValue(),
              showApplySelections: showApplySelections.getValue(),
              ignoreParentSettings: ignoreParentSettings.getValue(),
            });
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
          controlStyle: controlStyle$,
        },
        controlGroupComparators
      );

      /** Subscribe to all children's output filters, combine them, and output them */
      const outputFiltersSubscription = combineCompatibleApis<PublishesFilters, Filter[]>(
        api,
        'filters$',
        apiPublishesFilters
      ).subscribe((newFilters) => {
        filters$.next(newFilters);
      });

      /** Subscribe to all children's output data views, combine them, and output them */
      const childDataViewsSubscription = combineCompatibleApis<PublishesDataViews, DataView[]>(
        api,
        'dataViews',
        apiPublishesDataViews
      ).subscribe((newDataViews) => dataViews.next(newDataViews));

      return {
        api,
        Component: () => {
          const panels = useStateFromPublishingSubject(panels$);

          useEffect(() => {
            return () => {
              outputFiltersSubscription.unsubscribe();
              childDataViewsSubscription.unsubscribe();
            };
          }, []);

          return (
            <>
              {Object.keys(panels).map((id) => (
                <ControlRenderer
                  key={uuid}
                  maybeId={id}
                  services={services}
                  type={panels[id].type}
                  // state={panels[id]}
                  // parentApi={api}
                  getParentApi={() => api}
                  onApiAvailable={(controlApi) => {
                    children$.next({
                      ...children$.getValue(),
                      [controlApi.uuid]: controlApi,
                    });
                  }}
                />
              ))}
            </>
          );
        },
      };
    },
  };

  return controlGroupEmbeddableFactory;
};
