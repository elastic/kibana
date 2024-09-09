/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import { apiPublishesDataViews, PublishesDataViews } from '@kbn/presentation-publishing';
import { uniqBy } from 'lodash';
import { combineLatest, map, Observable, of, switchMap } from 'rxjs';
import { pluginServices } from '../../../../services/plugin_services';
import { DashboardContainer } from '../../dashboard_container';

export function startSyncingDashboardDataViews(this: DashboardContainer) {
  const {
    data: { dataViews },
  } = pluginServices.getServices();

  const controlGroupDataViewsPipe: Observable<DataView[]> = this.controlGroup
    ? this.controlGroup.getOutput$().pipe(
        map((output) => output.dataViewIds ?? []),
        switchMap(
          (dataViewIds) =>
            new Promise<DataView[]>((resolve) =>
              Promise.all(dataViewIds.map((id) => dataViews.get(id))).then((nextDataViews) =>
                resolve(nextDataViews)
              )
            )
        )
      )
    : of([]);

  const childDataViewsPipe = combineCompatibleChildrenApis<PublishesDataViews, DataView[]>(
    this,
    'dataViews',
    apiPublishesDataViews,
    []
  );

  return combineLatest([controlGroupDataViewsPipe, childDataViewsPipe])
    .pipe(
      switchMap(([controlGroupDataViews, childDataViews]) => {
        const allDataViews = controlGroupDataViews.concat(childDataViews);
        if (allDataViews.length === 0) {
          return (async () => {
            const defaultDataViewId = await dataViews.getDefaultId();
            return [await dataViews.get(defaultDataViewId!)];
          })();
        }
        return of(uniqBy(allDataViews, 'id'));
      })
    )
    .subscribe((newDataViews) => {
      if (newDataViews[0].id) this.controlGroup?.setRelevantDataViewId(newDataViews[0].id);
      this.setAllDataViews(newDataViews);
    });
}
