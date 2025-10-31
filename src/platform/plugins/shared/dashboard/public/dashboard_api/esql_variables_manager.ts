/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { PublishesESQLVariable } from '@kbn/esql-types';
import { apiPublishesESQLVariable, type ESQLControlVariable } from '@kbn/esql-types';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { PublishingSubject } from '@kbn/presentation-publishing';

export const initializeESQLVariablesManager = (
  children$: PublishingSubject<{ [key: string]: DefaultEmbeddableApi }>
) => {
  const esqlVariables$ = new BehaviorSubject<ESQLControlVariable[]>([]);
  const childrenESQLVariablesSubscription = combineCompatibleChildrenApis<
    PublishesESQLVariable,
    ESQLControlVariable[]
  >({ children$ }, 'esqlVariable$', apiPublishesESQLVariable, []).subscribe((newESQLVariables) => {
    console.log({ newESQLVariables });
    esqlVariables$.next(newESQLVariables);
  });

  return {
    api: {
      esqlVariables$,
    },
    cleanup: () => {
      childrenESQLVariablesSubscription.unsubscribe();
    },
  };
};
