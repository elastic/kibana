/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniqBy } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { merge, Observable, pipe } from 'rxjs';
import { distinctUntilChanged, switchMap, startWith, filter, mapTo, map } from 'rxjs/operators';

import { DashboardContainer } from '..';
import { isErrorEmbeddable } from '../../services/embeddable';
import { IndexPattern, IndexPatternsContract } from '../../services/data';

interface SyncDashboardIndexPatternsProps {
  dashboardContainer: DashboardContainer;
  indexPatterns: IndexPatternsContract;
  onUpdateIndexPatterns: (newIndexPatterns: IndexPattern[]) => void;
}

export const syncDashboardIndexPatterns = ({
  dashboardContainer,
  indexPatterns,
  onUpdateIndexPatterns,
}: SyncDashboardIndexPatternsProps) => {
  const updateIndexPatternsOperator = pipe(
    filter((container: DashboardContainer) => !!container && !isErrorEmbeddable(container)),
    map((container: DashboardContainer): IndexPattern[] => {
      let panelIndexPatterns: IndexPattern[] = [];
      Object.values(container.getChildIds()).forEach((id) => {
        const embeddableInstance = container.getChild(id);
        if (isErrorEmbeddable(embeddableInstance)) return;
        const embeddableIndexPatterns = (embeddableInstance.getOutput() as any).indexPatterns;
        if (!embeddableIndexPatterns) return;
        panelIndexPatterns.push(...embeddableIndexPatterns);
      });
      panelIndexPatterns = uniqBy(panelIndexPatterns, 'id');
      return panelIndexPatterns;
    }),
    distinctUntilChanged((a, b) =>
      deepEqual(
        a.map((ip) => ip && ip.id),
        b.map((ip) => ip && ip.id)
      )
    ),
    // using switchMap for previous task cancellation
    switchMap((panelIndexPatterns: IndexPattern[]) => {
      return new Observable((observer) => {
        if (panelIndexPatterns && panelIndexPatterns.length > 0) {
          if (observer.closed) return;
          onUpdateIndexPatterns(panelIndexPatterns);
          observer.complete();
        } else {
          indexPatterns.getDefault().then((defaultIndexPattern) => {
            if (observer.closed) return;
            onUpdateIndexPatterns([defaultIndexPattern as IndexPattern]);
            observer.complete();
          });
        }
      });
    })
  );

  return merge(
    // output of dashboard container itself
    dashboardContainer.getOutput$(),
    // plus output of dashboard container children,
    // children may change, so make sure we subscribe/unsubscribe with switchMap
    dashboardContainer.getOutput$().pipe(
      map(() => dashboardContainer!.getChildIds()),
      distinctUntilChanged(deepEqual),
      switchMap((newChildIds: string[]) =>
        merge(...newChildIds.map((childId) => dashboardContainer!.getChild(childId).getOutput$()))
      )
    )
  )
    .pipe(
      mapTo(dashboardContainer),
      startWith(dashboardContainer), // to trigger initial index pattern update
      updateIndexPatternsOperator
    )
    .subscribe();
};
