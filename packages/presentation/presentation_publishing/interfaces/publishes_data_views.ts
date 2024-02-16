/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { PresentationContainer, useClosestCompatibleApi } from '@kbn/presentation-containers';
import { useEffect, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { PublishingSubject, useStateFromPublishingSubject } from '../publishing_subject';
import { HasParentApi } from './has_parent_api';

export interface PublishesDataViews {
  dataViews: PublishingSubject<DataView[] | undefined>;
}

export const apiPublishesDataViews = (
  unknownApi: null | unknown
): unknownApi is PublishesDataViews => {
  return Boolean(unknownApi && (unknownApi as PublishesDataViews)?.dataViews !== undefined);
};

/**
 * Gets this API's data views as a reactive variable which will cause re-renders on change.
 */
export const useDataViews = (api: Partial<PublishesDataViews> | undefined) =>
  useStateFromPublishingSubject(apiPublishesDataViews(api) ? api.dataViews : undefined);

export const useClosestDataViewsSubject = (api: unknown, defaultDataView: DataView) => {
  const dataViews$ = useMemo(
    () => new BehaviorSubject<DataView[]>([defaultDataView]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const closestDataViewProvider = useClosestCompatibleApi(
    api as Partial<HasParentApi<PresentationContainer>>,
    apiPublishesDataViews
  );

  useEffect(() => {
    if (!closestDataViewProvider) {
      dataViews$.next([defaultDataView]);
    }
    if (!closestDataViewProvider) return;
    const subscription = closestDataViewProvider.dataViews.subscribe((providedDataViews) => {
      if (providedDataViews) {
        dataViews$.next(providedDataViews);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [closestDataViewProvider, dataViews$, defaultDataView]);

  return dataViews$;
};
