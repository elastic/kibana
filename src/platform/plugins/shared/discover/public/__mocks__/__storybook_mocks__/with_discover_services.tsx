/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FunctionComponent, ReactNode } from 'react';
import { action } from '@storybook/addon-actions';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { identity } from 'lodash';
import { IUiSettingsClient } from '@kbn/core/public';
import {
  DEFAULT_COLUMNS_SETTING,
  MAX_DOC_FIELDS_DISPLAYED,
  ROW_HEIGHT_OPTION,
  SAMPLE_SIZE_SETTING,
  SHOW_MULTIFIELDS,
} from '@kbn/discover-utils';
import { LocalStorageMock } from '../local_storage_mock';
import { DiscoverServices } from '../../build_services';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { SavedQuery } from '@kbn/data-plugin/public';

interface DiscoverServicesProviderProps {
  children: ReactNode;
}

export const uiSettingsMock = {
  get: (key: string) => {
    if (key === MAX_DOC_FIELDS_DISPLAYED) {
      return 3;
    } else if (key === SAMPLE_SIZE_SETTING) {
      return 10;
    } else if (key === DEFAULT_COLUMNS_SETTING) {
      return ['default_column'];
    } else if (key === SHOW_MULTIFIELDS) {
      return false;
    } else if (key === ROW_HEIGHT_OPTION) {
      return 3;
    } else if (key === 'dateFormat:tz') {
      return true;
    }
  },
  isDefault: () => {
    return true;
  },
} as unknown as IUiSettingsClient;

const filterManager = {
  getGlobalFilters: () => [],
  getAppFilters: () => [],
  getFetches$: () => new Observable(),
};

const theme = {
  theme$: of({ darkMode: false }),
};

export const services = {
  core: {
    http: { basePath: { prepend: () => void 0 } },
    notifications: { toasts: {}, showErrorDialog: action('showErrorDialog') },
    docLinks: { links: { discover: {} } },
    theme,
  },
  storage: new LocalStorageMock({}) as unknown as Storage,
  data: {
    query: {
      timefilter: {
        timefilter: {
          setTime: action('Set timefilter time'),
          getAbsoluteTime: () => {
            return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
          },
          getTime: () => ({
            from: 'now-7d',
            to: 'now',
          }),
          getRefreshInterval: () => ({}),
          getFetch$: () => new Observable(),
          getAutoRefreshFetch$: () => new Observable(),
          calculateBounds: () => ({ min: undefined, max: undefined }),
          getTimeDefaults: () => ({}),
          createFilter: () => ({}),
        },
      },
      savedQueries: { findSavedQueries: () => Promise.resolve({ queries: [] as SavedQuery[] }) },
      queryString: {
        getDefaultQuery: () => {
          return { query: '', language: 'kuery' };
        },
        getUpdates$: () => new Observable(),
      },
      filterManager,
      getState: () => {
        return {
          filters: [],
          query: { query: '', language: 'kuery' },
        };
      },
      state$: new Observable(),
    },
    search: {
      session: {
        getSession$: () => {
          return new BehaviorSubject('test').asObservable();
        },
        state$: new Observable(),
      },
      searchSource: {
        createEmpty: () => {
          const empty = {
            setField: () => {
              return empty;
            },
            fetch$: () => new Observable(),
          };
          return empty;
        },
      },
    },
    dataViews: {
      getIdsWithTitle: () => Promise.resolve([]),
      get: () => Promise.resolve({}),
      find: () => Promise.resolve([]),
    },
  },
  uiSettings: uiSettingsMock,
  dataViewFieldEditor: {
    openEditor: () => void 0,
    userPermissions: {
      editIndexPattern: () => void 0,
    },
  },
  theme,
  capabilities: {
    visualize: {
      show: true,
    },
    discover: {
      save: false,
    },
    advancedSettings: {
      save: true,
    },
  },
  docLinks: { links: { discover: {} } },
  addBasePath: (path: string) => path,
  filterManager,
  history: () => ({}),
  fieldFormats: {
    deserialize: () => {
      const DefaultFieldFormat = FieldFormat.from(identity);
      return new DefaultFieldFormat();
    },
  },
  toastNotifications: {
    addInfo: action('add toast'),
  },
  lens: {
    EmbeddableComponent: <div>Histogram</div>,
  },
  unifiedSearch: {
    autocomplete: {
      hasQuerySuggestions: () => Promise.resolve([]),
      getQuerySuggestions: () => Promise.resolve([]),
    },
  },
} as unknown as DiscoverServices;

export const withDiscoverServices = (Component: FunctionComponent) => {
  return (props: object) => (
    <KibanaContextProvider services={services}>
      <Component {...props} />
    </KibanaContextProvider>
  );
};

export const DiscoverServicesProvider: FunctionComponent<DiscoverServicesProviderProps> = ({
  children,
}) => {
  return <KibanaContextProvider services={services}>{children}</KibanaContextProvider>;
};
