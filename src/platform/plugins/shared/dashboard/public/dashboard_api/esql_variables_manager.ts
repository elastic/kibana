/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { PublishesESQLVariable } from '@kbn/esql-types';
import { apiPublishesESQLVariable, type ESQLControlVariable } from '@kbn/esql-types';
import { combineCompatibleChildrenApis } from '@kbn/presentation-publishing';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import {
  BehaviorSubject,
  combineLatestWith,
  distinctUntilChanged,
  filter,
  first,
  skip,
  type Subject,
  switchMap,
} from 'rxjs';
import type { initializeSettingsManager } from './settings_manager';

export const initializeESQLVariablesManager = (
  children$: PublishingSubject<{ [key: string]: DefaultEmbeddableApi }>,
  settingsManager: ReturnType<typeof initializeSettingsManager>,
  forcePublish$: Subject<void>
) => {
  const publishedEsqlVariables$ = new BehaviorSubject<ESQLControlVariable[]>([]);
  const unpublishedEsqlVariables$ = new BehaviorSubject<ESQLControlVariable[]>([]);

  const childrenESQLVariablesSubscription = combineCompatibleChildrenApis<
    PublishesESQLVariable,
    ESQLControlVariable[]
  >({ children$ }, 'esqlVariable$', apiPublishesESQLVariable, [])
    .pipe(distinctUntilChanged(deepEqual))
    .subscribe((newESQLVariables) => {
      unpublishedEsqlVariables$.next(newESQLVariables);
    });

  const publishVariables = () => {
    const published = publishedEsqlVariables$.getValue();
    const unpublished = unpublishedEsqlVariables$.getValue();
    if (!deepEqual(published, unpublished)) {
      publishedEsqlVariables$.next(unpublished);
    }
  };

  /** when auto publish is `true`, push filters from `unpublishedFilters$` directly to published */
  const autoPublishFiltersSubscription = unpublishedEsqlVariables$
    .pipe(
      combineLatestWith(settingsManager.api.settings.autoApplyFilters$),
      filter(([_, autoApplyFilters]) => autoApplyFilters)
    )
    .subscribe(([filters, autoApplyFilters]) => {
      publishVariables();
    });

  /** when auto-apply is `false`, publish the first set of variables once the children are available */
  if (!settingsManager.api.settings.autoApplyFilters$.getValue()) {
    unpublishedEsqlVariables$.pipe(skip(1), first()).subscribe(() => {
      publishVariables();
    });
  }

  /** when auto-apply is `false` and the dashboard is reset, wait for new filters to be updated and publish them */
  const forcePublishSubscription = forcePublish$
    .pipe(
      switchMap(async () => {
        await new Promise((resolve) => {
          unpublishedEsqlVariables$.pipe(first()).subscribe(resolve);
        });
      })
    )
    .subscribe(() => {
      publishVariables();
    });

  return {
    api: {
      publishedEsqlVariables$,
      unpublishedEsqlVariables$,
      publishVariables,
    },
    cleanup: () => {
      childrenESQLVariablesSubscription.unsubscribe();
      autoPublishFiltersSubscription.unsubscribe();
      forcePublishSubscription.unsubscribe();
    },
  };
};
