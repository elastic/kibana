/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniqBy } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { Observable, pipe, combineLatest } from 'rxjs';
import { distinctUntilChanged, switchMap, filter, mapTo, map } from 'rxjs/operators';

import { DashboardContainer } from '..';
import { isErrorEmbeddable } from '../../services/embeddable';
import { DataViewsContract } from '../../services/data';
import { DataView } from '../../services/data_views';

interface SyncDashboardDataViewsProps {
  dashboardContainer: DashboardContainer;
  dataViews: DataViewsContract;
  onUpdateDataViews: (newDataViews: DataView[]) => void;
}

export const syncDashboardDataViews = ({
  dashboardContainer,
  dataViews,
  onUpdateDataViews,
}: SyncDashboardDataViewsProps) => {
  const updateDataViewsOperator = pipe(
    filter((container: DashboardContainer) => !!container && !isErrorEmbeddable(container)),
    map((container: DashboardContainer): DataView[] | undefined => {
      let panelDataViews: DataView[] = [];

      Object.values(container.getChildIds()).forEach((id) => {
        const embeddableInstance = container.getChild(id);
        if (isErrorEmbeddable(embeddableInstance)) return;
        const embeddableDataViews = (
          embeddableInstance.getOutput() as { indexPatterns: DataView[] }
        ).indexPatterns;
        if (!embeddableDataViews) return;
        panelDataViews.push(...embeddableDataViews);
      });
      if (container.controlGroup) {
        panelDataViews.push(...(container.controlGroup.getOutput().dataViews ?? []));
      }
      panelDataViews = uniqBy(panelDataViews, 'id');

      /**
       * If no index patterns have been returned yet, and there is at least one embeddable which
       * hasn't yet loaded, defer the loading of the default index pattern by returning undefined.
       */
      if (
        panelDataViews.length === 0 &&
        Object.keys(container.getOutput().embeddableLoaded).length > 0 &&
        Object.values(container.getOutput().embeddableLoaded).some((value) => value === false)
      ) {
        return;
      }
      if (panelDataViews.length > 0 && panelDataViews[0].id) {
        dashboardContainer.setRelevantDataViewId(panelDataViews[0].id);
      }
      return panelDataViews;
    }),
    distinctUntilChanged((a, b) =>
      deepEqual(
        a?.map((ip) => ip && ip.id),
        b?.map((ip) => ip && ip.id)
      )
    ),
    // using switchMap for previous task cancellation
    switchMap((panelDataViews?: DataView[]) => {
      return new Observable((observer) => {
        if (!panelDataViews) return;
        if (panelDataViews.length > 0) {
          if (observer.closed) return;
          onUpdateDataViews(panelDataViews);
          observer.complete();
        } else {
          dataViews.getDefault().then((defaultDataView) => {
            if (observer.closed) return;
            onUpdateDataViews([defaultDataView as DataView]);
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
    .pipe(mapTo(dashboardContainer), updateDataViewsOperator)
    .subscribe();
};
