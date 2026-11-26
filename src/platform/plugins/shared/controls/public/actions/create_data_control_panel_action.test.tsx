/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import type { DataView } from '@kbn/data-views-plugin/common';
import { getFirstPersistedDataViewId } from './create_data_control_panel_action';

const getSource = (id: string, isPersisted: boolean) =>
  ({ id, isPersisted: () => isPersisted } as unknown as DataView);

const getEmbeddable = (dataViews?: DataView[]) => ({
  dataViews$: new BehaviorSubject<DataView[] | undefined>(dataViews),
});

describe('getFirstPersistedDataViewId', () => {
  test('returns the first persisted data view', () => {
    expect(
      getFirstPersistedDataViewId(
        getEmbeddable([getSource('persisted-1', true), getSource('persisted-2', true)])
      )
    ).toBe('persisted-1');
  });

  test('skips ad hoc data views', () => {
    expect(
      getFirstPersistedDataViewId(
        getEmbeddable([getSource('ad-hoc', false), getSource('persisted', true)])
      )
    ).toBe('persisted');
  });

  test('returns undefined when only ad hoc data views are published', () => {
    expect(
      getFirstPersistedDataViewId(getEmbeddable([getSource('ad-hoc', false)]))
    ).toBeUndefined();
  });

  test('returns undefined when no data views are published', () => {
    expect(getFirstPersistedDataViewId(getEmbeddable(undefined))).toBeUndefined();
  });

  test('returns undefined when the embeddable does not publish data views', () => {
    expect(getFirstPersistedDataViewId({})).toBeUndefined();
  });
});
