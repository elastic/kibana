/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { childrenUnsavedChanges$, PresentationContainer } from '@kbn/presentation-containers';
import { apiPublishesUnsavedChanges, PublishesUnsavedChanges } from '@kbn/presentation-publishing';
import { combineLatest, map } from 'rxjs';

export function initializeControlGroupUnsavedChanges(
  children$: PresentationContainer['children$']
) {
  return {
    api: {
      unsavedChanges: combineLatest([childrenUnsavedChanges$(children$)]).pipe(
        map(([unsavedControlState]) => {
          const unsavedChanges: { [key: string]: unknown } = {};
          if (unsavedControlState) {
            unsavedChanges.controls = unsavedControlState;
          }
          return Object.keys(unsavedChanges).length ? unsavedChanges : undefined;
        })
      ),
      resetUnsavedChanges: () => {
        Object.values(children$.value).forEach((controlApi) => {
          if (apiPublishesUnsavedChanges(controlApi)) controlApi.resetUnsavedChanges();
        });
      },
    } as PublishesUnsavedChanges,
  };
}
