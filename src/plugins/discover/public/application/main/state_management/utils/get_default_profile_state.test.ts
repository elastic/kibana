/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fieldList } from '@kbn/data-views-plugin/common';
import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createContextAwarenessMocks } from '../../../../context_awareness/__mocks__';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { getDefaultProfileState } from './get_default_profile_state';

const emptyDataView = buildDataViewMock({
  name: 'emptyDataView',
  fields: fieldList(),
});
const { profilesManagerMock } = createContextAwarenessMocks();

profilesManagerMock.resolveDataSourceProfile({});

describe('getDefaultProfileState', () => {
  it('should return expected columns', () => {
    let appState = getDefaultProfileState({
      profilesManager: profilesManagerMock,
      resetDefaultProfileState: {
        columns: true,
        rowHeight: false,
      },
      defaultColumns: ['messsage', 'bytes'],
      dataView: dataViewWithTimefieldMock,
      esqlQueryColumns: undefined,
    });
    expect(appState).toEqual({
      columns: ['message', 'extension', 'bytes'],
      grid: {
        columns: {
          extension: {
            width: 200,
          },
          message: {
            width: 100,
          },
        },
      },
    });
    appState = getDefaultProfileState({
      profilesManager: profilesManagerMock,
      resetDefaultProfileState: {
        columns: true,
        rowHeight: false,
      },
      defaultColumns: ['messsage', 'bytes'],
      dataView: emptyDataView,
      esqlQueryColumns: [{ id: '1', name: 'foo', meta: { type: 'string' } }],
    });
    expect(appState).toEqual({
      columns: ['foo'],
      grid: {
        columns: {
          foo: {
            width: 300,
          },
        },
      },
    });
  });

  it('should return expected rowHeight', () => {
    const appState = getDefaultProfileState({
      profilesManager: profilesManagerMock,
      resetDefaultProfileState: {
        columns: false,
        rowHeight: true,
      },
      defaultColumns: [],
      dataView: dataViewWithTimefieldMock,
      esqlQueryColumns: undefined,
    });
    expect(appState).toEqual({
      rowHeight: 3,
    });
  });

  it('should return undefined', () => {
    const appState = getDefaultProfileState({
      profilesManager: profilesManagerMock,
      resetDefaultProfileState: {
        columns: false,
        rowHeight: false,
      },
      defaultColumns: [],
      dataView: dataViewWithTimefieldMock,
      esqlQueryColumns: undefined,
    });
    expect(appState).toEqual(undefined);
  });
});
