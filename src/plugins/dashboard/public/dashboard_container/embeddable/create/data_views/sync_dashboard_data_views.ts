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

import { DataView } from '@kbn/data-views-plugin/common';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import { pluginServices } from '../../../../services/plugin_services';
import { DashboardContainer } from '../../dashboard_container';

export function startSyncingDashboardDataViews(this: DashboardContainer) {
  const {
    data: { dataViews },
  } = pluginServices.getServices();

  const onUpdateDataViews = async (newDataViewIds: string[]) => {
    if (this.controlGroup) this.controlGroup.setRelevantDataViewId(newDataViewIds[0]);

    // fetch all data views. These should be cached locally at this time so we will not need to query ES.
    const responses = await Promise.allSettled(newDataViewIds.map((id) => dataViews.get(id)));
    // Keep only fullfilled ones as each panel will handle the rejected ones already on their own
    const allDataViews = responses
      .filter(
        (response): response is PromiseFulfilledResult<DataView> => response.status === 'fulfilled'
      )
      .map(({ value }) => value);
    this.setAllDataViews(allDataViews);
  };

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

  const dataViewSources = [this.getOutput$()];
  if (this.controlGroup) dataViewSources.push(this.controlGroup.getOutput$());

  return combineLatest(dataViewSources)
    .pipe(
      map(() => this),
      updateDataViewsOperator
    )
    .subscribe();
}
