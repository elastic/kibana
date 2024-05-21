/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { BehaviorSubject, combineLatest, map, Observable, of, switchMap } from 'rxjs';

import {
  ControlsPanels,
  ControlWidth,
  CONTROL_GROUP_TYPE,
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
  ControlGroupChainingSystem,
} from '@kbn/controls-plugin/common';
import { ControlStyle, ParentIgnoreSettings } from '@kbn/controls-plugin/public';
import { OverlayStart } from '@kbn/core/public';
import { DataView } from '@kbn/data-views-plugin/common';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { Filter } from '@kbn/es-query';
import {
  apiPublishesFilter,
  PublishesFilter,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';

import { ControlRenderer } from '../control_renderer';
import { DefaultControlApi } from '../types';
import { deserializeControlGroup, serializeControlGroup } from './serialization_utils';
import { ControlGroupApi, ControlGroupRuntimeState, ControlGroupSerializedState } from './types';

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

      /** Subscribe to all children's output filters, combine them, and output them to parent */
      const outputFiltersSubscription = children$
        .pipe(
          switchMap((children) => {
            const childrenThatPublishFilter: PublishesFilter[] = [];
            for (const child of Object.values(children)) {
              if (apiPublishesFilter(child)) childrenThatPublishFilter.push(child);
            }
            if (childrenThatPublishFilter.length === 0) return of([]);
            return combineLatest(childrenThatPublishFilter.map((child) => child.filter$));
          }),
          map((nextFilters) => nextFilters.flat().filter((filter) => Boolean(filter)) as Filter[])
        )
        .subscribe((filters) => {
          console.log('filters', filters);
          filters$.next(filters);
        });

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

          useEffect(() => {
            return () => {
              outputFiltersSubscription.unsubscribe();
            };
          }, []);

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
