/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { SearchSource } from '@kbn/data-plugin/common';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { action } from '@storybook/addon-actions';
import { createHashHistory } from 'history';
import { FetchStatus } from '../../../../types';
import {
  AvailableFields$,
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
  RecordRawType,
} from '../../../services/discover_data_state_container';
import { buildDataTableRecordList } from '../../../../../utils/build_data_record';
import { esHits } from '../../../../../__mocks__/es_hits';
import { SavedSearch } from '../../../../..';
import { DiscoverLayoutProps } from '../types';
import {
  DiscoverStateContainer,
  getDiscoverStateContainer,
} from '../../../services/discover_state';
import { services } from '../../../../../__mocks__/__storybook_mocks__/with_discover_services';

const documentObservables = {
  main$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    foundDocuments: true,
  }) as DataMain$,

  documents$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: buildDataTableRecordList(esHits),
  }) as DataDocuments$,

  availableFields$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    fields: [] as string[],
  }) as AvailableFields$,

  totalHits$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: Number(esHits.length),
  }) as DataTotalHits$,
  fetch$: new Observable(),
};

const plainRecordObservables = {
  main$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    foundDocuments: true,
    recordRawType: RecordRawType.PLAIN,
  }) as DataMain$,

  documents$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: buildDataTableRecordList(esHits),
    recordRawType: RecordRawType.PLAIN,
  }) as DataDocuments$,

  availableFields$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    fields: [] as string[],
    recordRawType: RecordRawType.PLAIN,
  }) as AvailableFields$,

  totalHits$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    recordRawType: RecordRawType.PLAIN,
  }) as DataTotalHits$,
};

const getCommonProps = () => {
  const searchSourceMock = {} as unknown as SearchSource;

  const savedSearchMock = {} as unknown as SavedSearch;
  return {
    inspectorAdapters: { requests: new RequestAdapter() },
    navigateTo: action('navigate to somewhere nice'),
    onChangeDataView: action('change the data view'),
    onUpdateQuery: action('update the query'),
    resetSavedSearch: action('reset the saved search the query'),
    savedSearch: savedSearchMock,
    savedSearchRefetch$: new Subject(),
    searchSource: searchSourceMock,
    stateContainer: {
      setAppState: action('Set app state'),
      appState: {
        getState: () => ({
          interval: 'auto',
        }),
        setState: action('Set app state'),
      },
    } as unknown as DiscoverStateContainer,
    setExpandedDoc: action('opening an expanded doc'),
  };
};

function getSavedSearch(dataView: DataView) {
  return {
    searchSource: {
      getField: (value: string) => {
        if (value === 'index') {
          return dataView;
        }
      },
      getOwnField: () => {
        return {
          query: '',
        };
      },
      createChild: () => {
        return {
          fetch$: () => new Observable(),
        } as unknown as SearchSource;
      },
    },
  } as unknown as SavedSearch;
}

export function getDocumentsLayoutProps(dataView: DataView) {
  const stateContainer = getDiscoverStateContainer({
    history: createHashHistory(),
    savedSearch: getSavedSearch(dataView),
    services,
  });
  stateContainer.appState.set({
    columns: ['name', 'message', 'bytes'],
    sort: dataView.timeFieldName ? [['date', 'desc']] : [['name', 'desc']],
    query: {
      language: 'kuery',
      query: '',
    },
    filters: [],
    hideChart: true,
  });
  stateContainer.actions.setDataView(dataView);
  stateContainer.dataState.data$ = documentObservables;
  return {
    ...getCommonProps(),
    stateContainer,
  } as unknown as DiscoverLayoutProps;
}

export const getPlainRecordLayoutProps = (dataView: DataView) => {
  const stateContainer = getDiscoverStateContainer({
    history: createHashHistory(),
    savedSearch: getSavedSearch(dataView),
    services,
  });
  stateContainer.appState.set({
    columns: ['name', 'message', 'bytes'],
    sort: [['date', 'desc']],
    query: {
      sql: 'SELECT * FROM "kibana_sample_data_ecommerce"',
    },
    filters: [],
  });
  stateContainer.actions.setDataView(dataView);
  stateContainer.dataState.data$ = plainRecordObservables;
  return {
    ...getCommonProps(),
    stateContainer,
  } as unknown as DiscoverLayoutProps;
};
