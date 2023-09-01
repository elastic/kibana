/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Observable, of } from 'rxjs';
import { DiscoverServices } from '../build_services';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { savedSearchPluginMock } from '@kbn/saved-search-plugin/public/mocks';
import { chromeServiceMock, coreMock, docLinksServiceMock } from '@kbn/core/public/mocks';
import {
  CONTEXT_STEP_SETTING,
  DEFAULT_COLUMNS_SETTING,
  DOC_HIDE_TIME_COLUMN_SETTING,
  MAX_DOC_FIELDS_DISPLAYED,
  SAMPLE_SIZE_SETTING,
  SAMPLE_ROWS_PER_PAGE_SETTING,
  SORT_DEFAULT_ORDER_SETTING,
  HIDE_ANNOUNCEMENTS,
  SEARCH_ON_PAGE_LOAD_SETTING,
} from '@kbn/discover-utils';
import {
  UI_SETTINGS,
  calculateBounds,
  SearchSource,
  IKibanaSearchResponse,
} from '@kbn/data-plugin/public';
import { TopNavMenu } from '@kbn/navigation-plugin/public';
import { FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { LocalStorageMock } from './local_storage_mock';
import { createDiscoverDataViewsMock } from './data_views';
import { SearchSourceDependencies } from '@kbn/data-plugin/common';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

export function createDiscoverServicesMock(): DiscoverServices {
  const dataPlugin = dataPluginMock.createStartContract();
  const expressionsPlugin = expressionsPluginMock.createStartContract();

  dataPlugin.query.filterManager.getFilters = jest.fn(() => []);
  dataPlugin.query.filterManager.getUpdates$ = jest.fn(() => of({}) as unknown as Observable<void>);
  dataPlugin.query.timefilter.timefilter.createFilter = jest.fn();
  dataPlugin.query.timefilter.timefilter.getAbsoluteTime = jest.fn(() => ({
    from: '2021-08-31T22:00:00.000Z',
    to: '2022-09-01T09:16:29.553Z',
  }));
  dataPlugin.query.timefilter.timefilter.getTime = jest.fn(() => {
    return { from: 'now-15m', to: 'now' };
  });
  dataPlugin.query.timefilter.timefilter.getRefreshInterval = jest.fn(() => {
    return { pause: true, value: 1000 };
  });

  dataPlugin.query.timefilter.timefilter.calculateBounds = jest.fn(calculateBounds);
  dataPlugin.query.getState = jest.fn(() => ({
    query: { query: '', language: 'lucene' },
    filters: [],
    time: {
      from: 'now-15m',
      to: 'now',
    },
  }));
  dataPlugin.dataViews = createDiscoverDataViewsMock();
  expressionsPlugin.run = jest.fn(() =>
    of({
      partial: false,
      result: {
        rows: [],
      },
    })
  ) as unknown as typeof expressionsPlugin.run;
  dataPlugin.search.searchSource.createEmpty = jest.fn(() => {
    const deps = {
      getConfig: jest.fn(),
    } as unknown as SearchSourceDependencies;
    const searchSource = new SearchSource({}, deps);
    searchSource.fetch$ = jest.fn().mockReturnValue(of({ rawResponse: { hits: { total: 2 } } }));
    searchSource.createChild = jest.fn((options = {}) => {
      const childSearchSource = new SearchSource({}, deps);
      childSearchSource.setParent(searchSource, options);
      childSearchSource.fetch$ = <T>() =>
        of({ rawResponse: { hits: { hits: [] } } } as unknown as IKibanaSearchResponse<
          SearchResponse<T>
        >);
      return childSearchSource;
    });
    return searchSource;
  });

  const corePluginMock = coreMock.createStart();

  const uiSettingsMock: Partial<typeof corePluginMock.uiSettings> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: jest.fn((key: string): any => {
      if (key === 'fields:popularLimit') {
        return 5;
      } else if (key === DEFAULT_COLUMNS_SETTING) {
        return ['default_column'];
      } else if (key === UI_SETTINGS.META_FIELDS) {
        return [];
      } else if (key === DOC_HIDE_TIME_COLUMN_SETTING) {
        return false;
      } else if (key === CONTEXT_STEP_SETTING) {
        return 5;
      } else if (key === SORT_DEFAULT_ORDER_SETTING) {
        return 'desc';
      } else if (key === FORMATS_UI_SETTINGS.SHORT_DOTS_ENABLE) {
        return false;
      } else if (key === SAMPLE_SIZE_SETTING) {
        return 250;
      } else if (key === SAMPLE_ROWS_PER_PAGE_SETTING) {
        return 150;
      } else if (key === MAX_DOC_FIELDS_DISPLAYED) {
        return 50;
      } else if (key === HIDE_ANNOUNCEMENTS) {
        return false;
      } else if (key === SEARCH_ON_PAGE_LOAD_SETTING) {
        return true;
      }
    }),
    isDefault: jest.fn((key: string) => {
      return true;
    }),
  };

  corePluginMock.uiSettings = {
    ...corePluginMock.uiSettings,
    ...uiSettingsMock,
  };

  const theme = {
    theme$: of({ darkMode: false }),
  };

  corePluginMock.theme = theme;

  return {
    core: corePluginMock,
    charts: chartPluginMock.createSetupContract(),
    chrome: chromeServiceMock.createStartContract(),
    history: () => ({
      location: {
        search: '',
      },
      listen: jest.fn(),
    }),
    data: dataPlugin,
    docLinks: docLinksServiceMock.createStartContract(),
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
    fieldFormats: fieldFormatsMock,
    filterManager: dataPlugin.query.filterManager,
    inspector: {
      open: jest.fn(),
    },
    uiActions: uiActionsPluginMock.createStartContract(),
    uiSettings: uiSettingsMock,
    http: {
      basePath: '/',
    },
    dataViewEditor: {
      openEditor: jest.fn(),
      userPermissions: {
        editDataView: jest.fn(() => true),
      },
    },
    dataViewFieldEditor: {
      openEditor: jest.fn(),
      userPermissions: {
        editIndexPattern: jest.fn(() => true),
      },
    },
    navigation: {
      ui: { TopNavMenu, AggregateQueryTopNavMenu: TopNavMenu },
    },
    metadata: {
      branch: 'test',
    },
    theme,
    storage: new LocalStorageMock({}) as unknown as Storage,
    addBasePath: jest.fn(),
    toastNotifications: {
      addInfo: jest.fn(),
      addWarning: jest.fn(),
      addDanger: jest.fn(),
      addSuccess: jest.fn(),
    },
    expressions: expressionsPlugin,
    savedObjectsTagging: {
      ui: {
        getTagIdsFromReferences: jest.fn().mockResolvedValue([]),
        updateTagsReferences: jest.fn(),
      },
    },
    savedSearch: savedSearchPluginMock.createStartContract(),
    dataViews: dataPlugin.dataViews,
    timefilter: dataPlugin.query.timefilter.timefilter,
    lens: {
      EmbeddableComponent: jest.fn(() => null),
      stateHelperApi: jest.fn(() => {
        return {
          suggestions: jest.fn(),
        };
      }),
    },
    locator: {
      useUrl: jest.fn(() => ''),
      navigate: jest.fn(),
      getUrl: jest.fn(() => Promise.resolve('')),
      getRedirectUrl: jest.fn(() => ''),
    },
    contextLocator: { getRedirectUrl: jest.fn(() => '') },
    singleDocLocator: { getRedirectUrl: jest.fn(() => '') },
  } as unknown as DiscoverServices;
}

export const discoverServiceMock = createDiscoverServicesMock();
