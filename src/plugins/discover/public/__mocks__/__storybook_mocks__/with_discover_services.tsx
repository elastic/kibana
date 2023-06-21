/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import { action } from '@storybook/addon-actions';
import { EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { LIGHT_THEME } from '@elastic/charts';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { identity } from 'lodash';
import { CoreStart, IUiSettingsClient, PluginInitializerContext } from '@kbn/core/public';
import {
  DEFAULT_COLUMNS_SETTING,
  DOC_TABLE_LEGACY,
  MAX_DOC_FIELDS_DISPLAYED,
  ROW_HEIGHT_OPTION,
  SAMPLE_SIZE_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
  SHOW_MULTIFIELDS,
} from '../../../common';
import { SIDEBAR_CLOSED_KEY } from '../../application/main/components/layout/discover_layout';
import { LocalStorageMock } from '../local_storage_mock';
import { DiscoverServices } from '../../build_services';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Plugin as NavigationPublicPlugin } from '@kbn/navigation-plugin/public';
import { SearchBar, UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { SavedQuery } from '@kbn/data-plugin/public';
import { BehaviorSubject, Observable } from 'rxjs';

const NavigationPlugin = new NavigationPublicPlugin({} as PluginInitializerContext);

export const uiSettingsMock = {
  get: (key: string) => {
    if (key === MAX_DOC_FIELDS_DISPLAYED) {
      return 3;
    } else if (key === SAMPLE_SIZE_SETTING) {
      return 10;
    } else if (key === DEFAULT_COLUMNS_SETTING) {
      return ['default_column'];
    } else if (key === DOC_TABLE_LEGACY) {
      return false;
    } else if (key === SEARCH_FIELDS_FROM_SOURCE) {
      return false;
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

export const services = {
  core: {
    http: { basePath: { prepend: () => void 0 } },
    notifications: { toasts: {} },
    docLinks: { links: { discover: {} } },
  },
  storage: new LocalStorageMock({
    [SIDEBAR_CLOSED_KEY]: false,
  }) as unknown as Storage,
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
  navigation: NavigationPlugin.start({} as CoreStart, {
    unifiedSearch: {
      ui: { SearchBar, AggregateQuerySearchBar: SearchBar },
    } as unknown as UnifiedSearchPublicPluginStart,
  }),
  theme: {
    useChartsTheme: () => ({
      ...EUI_CHARTS_THEME_LIGHT.theme,
      chartPaddings: {
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
      },
      heatmap: { xAxisLabel: { rotation: {} } },
    }),
    useChartsBaseTheme: () => LIGHT_THEME,
  },
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
