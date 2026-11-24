/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';

import { initializeDataLoadingManager } from './data_loading_manager';

const buildChild = (uuid: string, dataLoading: boolean) =>
  ({
    uuid,
    dataLoading$: new BehaviorSubject<boolean | undefined>(dataLoading),
  } as unknown as DefaultEmbeddableApi);

describe('data loading manager', () => {
  test('is loading while a visible child is loading', () => {
    const children$ = new BehaviorSubject<{ [key: string]: DefaultEmbeddableApi }>({
      control: buildChild('control', false),
      panel: buildChild('panel', true),
    });
    const visibleChildren$ = new BehaviorSubject<string[]>(['control', 'panel']);
    const { api } = initializeDataLoadingManager(children$, visibleChildren$);
    expect(api.dataLoading$.value).toBe(true);
  });

  test('ignores a child that was hidden while it was still loading', () => {
    const children$ = new BehaviorSubject<{ [key: string]: DefaultEmbeddableApi }>({
      control: buildChild('control', false),
      panel: buildChild('panel', true),
    });
    const visibleChildren$ = new BehaviorSubject<string[]>(['control', 'panel']);
    const { api } = initializeDataLoadingManager(children$, visibleChildren$);

    // the grid is replaced by the awaiting screen, but the API of the panel lingers in `children$`
    visibleChildren$.next(['control']);
    expect(api.dataLoading$.value).toBe(false);
  });
});
