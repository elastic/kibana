/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import deepEqual from 'fast-deep-equal';
import { Observable, pipe, combineLatest } from 'rxjs';
import { distinctUntilChanged, switchMap, filter, map } from 'rxjs/operators';

import { DashboardContainer } from '..';
import { isErrorEmbeddable } from '../../services/embeddable';
import { DataViewsContract } from '../../services/data';
import { DataView } from '../../services/data_views';

interface SyncDashboardDataViewsProps {
  dashboardContainer: DashboardContainer;
  dataViews: DataViewsContract;
  onUpdateDataViews: (newDataViewIds: string[]) => void;
}

export const syncDashboardDataViews = ({
  dashboardContainer,
  dataViews,
  onUpdateDataViews,
}: SyncDashboardDataViewsProps) => {
  const updateDataViewsOperator = pipe(
    filter((container: DashboardContainer) => !!container && !isErrorEmbeddable(container)),
    map((container: DashboardContainer): string[] | undefined => {
      const panelDataViewIds: Set<string> = new Set<string>();

      Object.values(container.getChildIds()).forEach((id) => {
        const embeddableInstance = container.getChild(id);
        if (isErrorEmbeddable(embeddableInstance)) return;

        /**
         * TODO - this assumes that all embeddables which communicate data views do so via an `indexPatterns` key on their output.
         * This should be replaced with a more generic, interface based method where an embeddable can communicate a data view ID.
         */
        const childPanelDataViews = (
          embeddableInstance.getOutput() as { indexPatterns: DataView[] }
        ).indexPatterns;
        if (!childPanelDataViews) return;
        childPanelDataViews.forEach((dataView) => {
          if (dataView.id) panelDataViewIds.add(dataView.id);
        });
      });
      if (container.controlGroup) {
        const controlGroupDataViewIds = container.controlGroup.getOutput().dataViewIds;
        controlGroupDataViewIds?.forEach((dataViewId) => panelDataViewIds.add(dataViewId));
      }

      /**
       * If no index patterns have been returned yet, and there is at least one embeddable which
       * hasn't yet loaded, defer the loading of the default index pattern by returning undefined.
       */
      if (
        panelDataViewIds.size === 0 &&
        Object.keys(container.getOutput().embeddableLoaded).length > 0 &&
        Object.values(container.getOutput().embeddableLoaded).some((value) => value === false)
      ) {
        return;
      }
      return Array.from(panelDataViewIds);
    }),
    distinctUntilChanged((a, b) => deepEqual(a, b)),

    // using switchMap for previous task cancellation
    switchMap((allDataViewIds?: string[]) => {
      return new Observable((observer) => {
        if (!allDataViewIds) return;
        if (allDataViewIds.length > 0) {
          if (observer.closed) return;
          onUpdateDataViews(allDataViewIds);
          observer.complete();
        } else {
          dataViews.getDefaultId().then((defaultDataViewId) => {
            if (observer.closed) return;
            if (defaultDataViewId) {
              onUpdateDataViews([defaultDataViewId]);
            }
            observer.complete();
          });
        }
      });
    })
  );

  const dataViewSources = [dashboardContainer.getOutput$()];
  if (dashboardContainer.controlGroup)
    dataViewSources.push(dashboardContainer.controlGroup.getOutput$());

  return combineLatest(dataViewSources)
    .pipe(
      map(() => dashboardContainer),
      updateDataViewsOperator
    )
    .subscribe();
};
