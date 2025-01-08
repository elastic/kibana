/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BehaviorSubject,
  Observable,
  combineLatest,
  debounceTime,
  map,
  skipWhile,
  switchMap,
} from 'rxjs';

import type { Filter, TimeRange } from '@kbn/es-query';
import {
  type PublishingSubject,
  apiPublishesFilters,
  apiPublishesTimeslice,
} from '@kbn/presentation-publishing';

import type { ControlGroupChainingSystem } from '../../../common';

export interface ChainingContext {
  chainingFilters?: Filter[] | undefined;
  timeRange?: TimeRange | undefined;
}

export function chaining$(
  uuid: string,
  chainingSystem$: PublishingSubject<ControlGroupChainingSystem>,
  controlsInOrder$: PublishingSubject<Array<{ id: string; type: string }>>,
  children$: PublishingSubject<{ [key: string]: unknown }>
) {
  return combineLatest([chainingSystem$, controlsInOrder$, children$]).pipe(
    skipWhile(([chainingSystem, controlsInOrder, children]) => {
      if (chainingSystem === 'HIERARCHICAL') {
        for (let i = 0; i < controlsInOrder.length; i++) {
          if (controlsInOrder[i].id === uuid) {
            // all controls to the left are initialized
            return false;
          }

          if (!children[controlsInOrder[i].id]) {
            // a control to the left is not initialized
            // block rxjs pipe flow until its initialized
            return true;
          }
        }
      }

      // no chaining
      return false;
    }),
    switchMap(([chainingSystem, controlsInOrder, children]) => {
      const observables: Array<Observable<unknown>> = [];
      if (chainingSystem === 'HIERARCHICAL') {
        for (let i = 0; i < controlsInOrder.length; i++) {
          if (controlsInOrder[i].id === uuid) {
            break;
          }

          const chainedControlApi = children[controlsInOrder[i].id];

          const chainedControl$ = combineLatest([
            apiPublishesFilters(chainedControlApi)
              ? chainedControlApi.filters$
              : new BehaviorSubject(undefined),
            apiPublishesTimeslice(chainedControlApi)
              ? chainedControlApi.timeslice$
              : new BehaviorSubject(undefined),
          ]).pipe(
            map(([filters, timeslice]) => {
              return {
                filters,
                timeslice,
              };
            })
          );
          observables.push(chainedControl$);
        }
      }

      return observables.length ? combineLatest(observables) : new BehaviorSubject([]);
    }),
    debounceTime(0),
    map((chainedControlValues) => {
      const chainingFilters: Filter[] = [];
      let timeRange: undefined | TimeRange;
      (
        chainedControlValues as Array<{
          filters: undefined | Filter[];
          timeslice: undefined | [number, number];
        }>
      ).forEach((chainedControlValue) => {
        if (chainedControlValue.filters && chainedControlValue.filters.length) {
          chainingFilters.push(...chainedControlValue.filters);
        }
        if (chainedControlValue.timeslice) {
          timeRange = {
            from: new Date(chainedControlValue.timeslice[0]).toISOString(),
            to: new Date(chainedControlValue.timeslice[1]).toISOString(),
            mode: 'absolute' as 'absolute',
          };
        }
      });
      return {
        chainingFilters,
        timeRange,
      };
    })
  );
}
