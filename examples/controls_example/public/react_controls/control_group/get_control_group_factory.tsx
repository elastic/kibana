/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';

import {
  ControlsPanels,
  ControlWidth,
  CONTROL_GROUP_TYPE,
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
} from '@kbn/controls-plugin/common';
import { OverlayStart } from '@kbn/core/public';
import { DataView } from '@kbn/data-views-plugin/common';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { Filter } from '@kbn/es-query';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { omit } from 'lodash';
import { ControlRenderer } from '../control_renderer';
import {
  ControlGroupApi,
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
  DefaultControlApi,
} from '../types';
import { deserializeControlGroup, serializeControlGroup } from './serialization_utils';
import { ControlStyle, ParentIgnoreSettings } from '@kbn/controls-plugin/public';

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
      console.log('initialState', initialState);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const grow = new BehaviorSubject<boolean>(DEFAULT_CONTROL_GROW);
      const width = new BehaviorSubject<ControlWidth>(DEFAULT_CONTROL_WIDTH);
      const children$ = new BehaviorSubject<{ [key: string]: DefaultControlApi }>({});
      const filters$ = new BehaviorSubject<Filter[] | undefined>([]);
      const dataViews = new BehaviorSubject<DataView[] | undefined>(undefined);
      const panels$ = new BehaviorSubject<ControlsPanels>(initialState.panels);
      const controlStyle$ = new BehaviorSubject<ControlStyle>(initialState.controlStyle);
      const chainingSystem$ = new BehaviorSubject<ControlGroupChainingSystem>(
        initialState.chainingSystem
      );
      const showApplySelections = new BehaviorSubject<boolean | undefined>(
        initialState.showApplySelections
      );
      const ignoreParentSettings = new BehaviorSubject<ParentIgnoreSettings | undefined>(
        initialState.ignoreParentSettings
      );

      const embeddable = buildApi(
        {
          dataLoading: dataLoading$,
          children$,
          onEdit: async () => {
            // TODO: Edit control group settings
          },
          isEditingEnabled: () => true,
          getTypeDisplayName: () => 'Control group', // TODO: i18n
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
            console.log('Remove', panelId);
          },
          replacePanel: async (panelId, newPanel) => {
            // TODO: Replace a child control
            return Promise.resolve(panelId);
          },
          grow,
          width,
          filters$,
          dataViews,
        },
        {}
      );
      return {
        api: embeddable,
        Component: () => {
          const panels = useStateFromPublishingSubject(panels$);
          return (
            <>
              {Object.keys(panels).map((id) => (
                <ControlRenderer
                  key={uuid}
                  services={services}
                  type={panels[id].type}
                  state={panels[id]}
                  parentApi={embeddable}
                  onApiAvailable={(api) => {
                    children$.next({
                      ...children$.getValue(),
                      [api.uuid]: api as DefaultControlApi,
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
