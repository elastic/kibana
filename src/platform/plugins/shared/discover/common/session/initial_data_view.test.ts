/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { createDataViewDataSource, createEsqlDataSource } from '../data_sources';
import { getInitialDataViewId, getNavigationDataView, getRequestedDataView } from './initial_data_view';

describe('getInitialDataViewId', () => {
  it.each<[Parameters<typeof getInitialDataViewId>[0], string | undefined]>([
    [
      {
        dataSource: createDataViewDataSource({ dataViewId: 'app-id' }),
        documentDataViewId: 'document-id',
        restoredDataViewId: 'local-id',
      },
      'app-id',
    ],
    [
      { dataSource: undefined, documentDataViewId: 'document-id', restoredDataViewId: 'local-id' },
      'document-id',
    ],
    [{ dataSource: undefined, restoredDataViewId: 'local-id' }, 'local-id'],
    [{ dataSource: createEsqlDataSource(), documentDataViewId: 'document-id' }, 'document-id'],
    [{ dataSource: undefined }, undefined],
  ])('selects the initial ID from %j', (input, expected) => {
    expect(getInitialDataViewId(input)).toBe(expected);
  });
});

describe('getRequestedDataView', () => {
  const local = { id: 'local-id', title: 'local-*' };
  const navigation = { id: 'navigation-id', title: 'navigation-*' };

  it.each<[
    string,
    Parameters<typeof getRequestedDataView>[0],
    DataViewSpec | string | undefined
  ]>([
    [
      'an unsaved navigation definition before a local definition',
      {
        dataViewId: local.id,
        navigationDataView: getNavigationDataView(navigation, []),
        restoredDataViewSpec: local,
      },
      navigation,
    ],
    [
      'a matching local definition before a saved navigation ID',
      {
        dataViewId: local.id,
        navigationDataView: getNavigationDataView(navigation, [navigation.id]),
        restoredDataViewSpec: local,
      },
      local,
    ],
    [
      'a saved navigation ID before an unrelated requested ID',
      {
        dataViewId: 'another-id',
        navigationDataView: getNavigationDataView(navigation, [navigation.id]),
        restoredDataViewSpec: local,
      },
      navigation.id,
    ],
    [
      'the requested ID when the local spec does not match',
      { dataViewId: 'another-id', restoredDataViewSpec: local },
      'another-id',
    ],
    [
      'no view when none was requested',
      { dataViewId: undefined, restoredDataViewSpec: local },
      undefined,
    ],
  ])('selects %s', (_, input, expected) => {
    expect(getRequestedDataView(input)).toStrictEqual(expected);
  });
});
