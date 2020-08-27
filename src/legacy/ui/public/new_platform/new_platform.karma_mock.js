/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import sinon from 'sinon';
import { getFieldFormatsRegistry } from '../../../../test_utils/public/stub_field_formats';
import { METRIC_TYPE } from '@kbn/analytics';
import { setSetupServices, setStartServices } from './set_services';
import {
  AggTypesRegistry,
  getAggTypes,
  AggConfigs,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../src/plugins/data/common/search/aggs';
import { ComponentRegistry } from '../../../../../src/plugins/advanced_settings/public/';
import { UI_SETTINGS } from '../../../../../src/plugins/data/public/';
import {
  CSV_SEPARATOR_SETTING,
  CSV_QUOTE_VALUES_SETTING,
} from '../../../../../src/plugins/share/public';

const mockObservable = () => {
  return {
    subscribe: () => {},
    pipe: () => {
      return {
        subscribe: () => {},
      };
    },
  };
};

const mockComponent = () => {
  return null;
};

let refreshInterval = undefined;
let isTimeRangeSelectorEnabled = true;
let isAutoRefreshSelectorEnabled = true;

export const mockUiSettings = {
  get: (item, defaultValue) => {
    const defaultValues = {
      dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
      'dateFormat:tz': 'UTC',
      [UI_SETTINGS.SHORT_DOTS_ENABLE]: true,
      [UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX]: true,
      [UI_SETTINGS.QUERY_ALLOW_LEADING_WILDCARDS]: true,
      [UI_SETTINGS.QUERY_STRING_OPTIONS]: {},
      [UI_SETTINGS.FORMAT_CURRENCY_DEFAULT_PATTERN]: '($0,0.[00])',
      [UI_SETTINGS.FORMAT_NUMBER_DEFAULT_PATTERN]: '0,0.[000]',
      [UI_SETTINGS.FORMAT_PERCENT_DEFAULT_PATTERN]: '0,0.[000]%',
      [UI_SETTINGS.FORMAT_NUMBER_DEFAULT_LOCALE]: 'en',
      [UI_SETTINGS.FORMAT_DEFAULT_TYPE_MAP]: {},
      [CSV_SEPARATOR_SETTING]: ',',
      [CSV_QUOTE_VALUES_SETTING]: true,
      [UI_SETTINGS.SEARCH_QUERY_LANGUAGE]: 'kuery',
      'state:storeInSessionStorage': false,
    };

    return defaultValues[item] || defaultValue;
  },
  getUpdate$: () => ({
    subscribe: sinon.fake(),
  }),
  isDefault: sinon.fake(),
};

const mockCoreSetup = {
  chrome: {},
  http: {
    basePath: {
      get: sinon.fake.returns(''),
    },
  },
  injectedMetadata: {},
  uiSettings: mockUiSettings,
};

const mockCoreStart = {
  application: {
    capabilities: {},
  },
  chrome: {
    overlays: {
      openModal: sinon.fake(),
    },
  },
  http: {
    basePath: {
      get: sinon.fake.returns(''),
    },
  },
  notifications: {
    toasts: {},
  },
  i18n: {},
  overlays: {},
  savedObjects: {
    client: {},
  },
  uiSettings: mockUiSettings,
};

const querySetup = {
  state$: mockObservable(),
  filterManager: {
    getFetches$: sinon.fake(),
    getFilters: sinon.fake(),
    getAppFilters: sinon.fake(),
    getGlobalFilters: sinon.fake(),
    removeFilter: sinon.fake(),
    addFilters: sinon.fake(),
    setFilters: sinon.fake(),
    removeAll: sinon.fake(),
    getUpdates$: mockObservable,
  },
  timefilter: {
    timefilter: {
      getFetch$: mockObservable,
      getAutoRefreshFetch$: mockObservable,
      getEnabledUpdated$: mockObservable,
      getTimeUpdate$: mockObservable,
      getRefreshIntervalUpdate$: mockObservable,
      isTimeRangeSelectorEnabled: () => {
        return isTimeRangeSelectorEnabled;
      },
      isAutoRefreshSelectorEnabled: () => {
        return isAutoRefreshSelectorEnabled;
      },
      disableAutoRefreshSelector: () => {
        isAutoRefreshSelectorEnabled = false;
      },
      enableAutoRefreshSelector: () => {
        isAutoRefreshSelectorEnabled = true;
      },
      getRefreshInterval: () => {
        return refreshInterval;
      },
      setRefreshInterval: (interval) => {
        refreshInterval = interval;
      },
      enableTimeRangeSelector: () => {
        isTimeRangeSelectorEnabled = true;
      },
      disableTimeRangeSelector: () => {
        isTimeRangeSelectorEnabled = false;
      },
      getTime: sinon.fake(),
      setTime: sinon.fake(),
      getActiveBounds: sinon.fake(),
      getBounds: sinon.fake(),
      calculateBounds: sinon.fake(),
      createFilter: sinon.fake(),
    },
    history: sinon.fake(),
  },
  savedQueries: {
    saveQuery: sinon.fake(),
    getAllSavedQueries: sinon.fake(),
    findSavedQueries: sinon.fake(),
    getSavedQuery: sinon.fake(),
    deleteSavedQuery: sinon.fake(),
    getSavedQueryCount: sinon.fake(),
  },
};

const mockAggTypesRegistry = () => {
  const registry = new AggTypesRegistry();
  const registrySetup = registry.setup();
  const aggTypes = getAggTypes({
    calculateBounds: sinon.fake(),
    getConfig: sinon.fake(),
    getFieldFormatsStart: () => ({
      deserialize: sinon.fake(),
      getDefaultInstance: sinon.fake(),
    }),
    isDefaultTimezone: () => true,
  });
  aggTypes.buckets.forEach((type) => registrySetup.registerBucket(type));
  aggTypes.metrics.forEach((type) => registrySetup.registerMetric(type));

  return registry;
};

const aggTypesRegistry = mockAggTypesRegistry();

export const npSetup = {
  core: mockCoreSetup,
  plugins: {
    advancedSettings: {
      component: {
        register: sinon.fake(),
        componentType: ComponentRegistry.componentType,
      },
    },
    usageCollection: {
      allowTrackUserAgent: sinon.fake(),
      reportUiStats: sinon.fake(),
      METRIC_TYPE,
    },
    embeddable: {
      registerEmbeddableFactory: sinon.fake(),
    },
    expressions: {
      registerFunction: sinon.fake(),
      registerRenderer: sinon.fake(),
      registerType: sinon.fake(),
    },
    data: {
      autocomplete: {
        addProvider: sinon.fake(),
        getProvider: sinon.fake(),
      },
      query: querySetup,
      search: {
        aggs: {
          types: aggTypesRegistry.setup(),
        },
        __LEGACY: {
          esClient: {
            search: sinon.fake(),
            msearch: sinon.fake(),
          },
        },
      },
      fieldFormats: getFieldFormatsRegistry(mockCoreSetup),
    },
    share: {
      register: () => {},
      urlGenerators: {
        registerUrlGenerator: () => {},
      },
    },
    devTools: {
      register: () => {},
    },
    kibanaLegacy: {
      registerLegacyApp: () => {},
      forwardApp: () => {},
      config: {
        defaultAppId: 'home',
      },
    },
    inspector: {
      registerView: () => undefined,
      __LEGACY: {
        views: {
          register: () => undefined,
        },
      },
    },
    uiActions: {
      attachAction: sinon.fake(),
      registerAction: sinon.fake(),
      registerTrigger: sinon.fake(),
    },
    home: {
      featureCatalogue: {
        register: sinon.fake(),
      },
      environment: {
        update: sinon.fake(),
      },
      config: {
        disableWelcomeScreen: false,
      },
      tutorials: {
        setVariable: sinon.fake(),
      },
    },
    charts: {
      theme: {
        chartsTheme$: mockObservable,
        useChartsTheme: sinon.fake(),
      },
      colors: {
        seedColors: ['white', 'black'],
      },
    },
    management: {
      sections: {
        getSection: () => ({
          registerApp: sinon.fake(),
        }),
      },
    },
    indexPatternManagement: {
      list: { addListConfig: sinon.fake() },
      creation: { addCreationConfig: sinon.fake() },
    },
    discover: {
      docViews: {
        addDocView: sinon.fake(),
        setAngularInjectorGetter: sinon.fake(),
      },
    },
    visTypeVega: {
      config: sinon.fake(),
    },
    visualizations: {
      createBaseVisualization: sinon.fake(),
      createReactVisualization: sinon.fake(),
      registerAlias: sinon.fake(),
      hideTypes: sinon.fake(),
    },

    mapsLegacy: {
      serviceSettings: sinon.fake(),
      getPrecision: sinon.fake(),
      getZoomPrecision: sinon.fake(),
    },
  },
};

export const npStart = {
  core: mockCoreStart,
  plugins: {
    management: {
      legacy: {
        getSection: () => ({
          register: sinon.fake(),
          deregister: sinon.fake(),
          hasItem: sinon.fake(),
        }),
      },
      sections: {
        getSection: () => ({
          registerApp: sinon.fake(),
        }),
      },
    },
    indexPatternManagement: {
      list: {
        getType: sinon.fake(),
        getIndexPatternCreationOptions: sinon.fake(),
      },
      creation: {
        getIndexPatternTags: sinon.fake(),
        getFieldInfo: sinon.fake(),
        areScriptedFieldsEnabled: sinon.fake(),
      },
    },
    embeddable: {
      getEmbeddableFactory: sinon.fake(),
      getEmbeddableFactories: sinon.fake(),
      registerEmbeddableFactory: sinon.fake(),
    },
    expressions: {
      registerFunction: sinon.fake(),
      registerRenderer: sinon.fake(),
      registerType: sinon.fake(),
    },
    kibanaLegacy: {
      getForwards: () => [],
      loadFontAwesome: () => {},
      config: {
        defaultAppId: 'home',
      },
      dashboardConfig: {
        turnHideWriteControlsOn: sinon.fake(),
        getHideWriteControls: sinon.fake(),
      },
    },
    dashboard: {
      getSavedDashboardLoader: sinon.fake(),
    },
    data: {
      actions: {
        createFiltersFromValueClickAction: Promise.resolve(['yes']),
        createFiltersFromRangeSelectAction: sinon.fake(),
      },
      autocomplete: {
        getProvider: sinon.fake(),
      },
      getSuggestions: sinon.fake(),
      indexPatterns: {
        get: sinon.spy((indexPatternId) =>
          Promise.resolve({
            id: indexPatternId,
            isTimeNanosBased: () => false,
            popularizeField: () => {},
          })
        ),
      },
      ui: {
        IndexPatternSelect: mockComponent,
        SearchBar: mockComponent,
      },
      query: {
        filterManager: {
          getFetches$: sinon.fake(),
          getFilters: sinon.fake(),
          getAppFilters: sinon.fake(),
          getGlobalFilters: sinon.fake(),
          removeFilter: sinon.fake(),
          addFilters: sinon.fake(),
          setFilters: sinon.fake(),
          removeAll: sinon.fake(),
          getUpdates$: mockObservable,
        },
        timefilter: {
          timefilter: {
            getFetch$: mockObservable,
            getAutoRefreshFetch$: mockObservable,
            getEnabledUpdated$: mockObservable,
            getTimeUpdate$: mockObservable,
            getRefreshIntervalUpdate$: mockObservable,
            isTimeRangeSelectorEnabled: () => {
              return isTimeRangeSelectorEnabled;
            },
            isAutoRefreshSelectorEnabled: () => {
              return isAutoRefreshSelectorEnabled;
            },
            disableAutoRefreshSelector: () => {
              isAutoRefreshSelectorEnabled = false;
            },
            enableAutoRefreshSelector: () => {
              isAutoRefreshSelectorEnabled = true;
            },
            getRefreshInterval: () => {
              return refreshInterval;
            },
            setRefreshInterval: (interval) => {
              refreshInterval = interval;
            },
            enableTimeRangeSelector: () => {
              isTimeRangeSelectorEnabled = true;
            },
            disableTimeRangeSelector: () => {
              isTimeRangeSelectorEnabled = false;
            },
            getTime: sinon.fake(),
            setTime: sinon.fake(),
            getActiveBounds: sinon.fake(),
            getBounds: sinon.fake(),
            calculateBounds: sinon.fake(),
            createFilter: sinon.fake(),
          },
          history: sinon.fake(),
        },
      },
      search: {
        aggs: {
          calculateAutoTimeExpression: sinon.fake(),
          createAggConfigs: (indexPattern, configStates = []) => {
            return new AggConfigs(indexPattern, configStates, {
              typesRegistry: aggTypesRegistry.start(),
              fieldFormats: getFieldFormatsRegistry(mockCoreStart),
            });
          },
          types: aggTypesRegistry.start(),
        },
        __LEGACY: {
          esClient: {
            search: sinon.fake(),
            msearch: sinon.fake(),
          },
        },
      },
      fieldFormats: getFieldFormatsRegistry(mockCoreStart),
    },
    share: {
      toggleShareContextMenu: () => {},
    },
    inspector: {
      isAvailable: () => false,
      open: () => ({
        onClose: Promise.resolve(undefined),
        close: () => Promise.resolve(undefined),
      }),
    },
    uiActions: {
      attachAction: sinon.fake(),
      registerAction: sinon.fake(),
      registerTrigger: sinon.fake(),
      detachAction: sinon.fake(),
      executeTriggerActions: sinon.fake(),
      getTrigger: sinon.fake(),
      getTriggerActions: sinon.fake(),
      getTriggerCompatibleActions: sinon.fake(),
    },
    visualizations: {
      get: sinon.fake(),
      all: sinon.fake(),
      getAliases: sinon.fake(),
      savedVisualizationsLoader: {},
      showNewVisModal: sinon.fake(),
      createVis: sinon.fake(),
      convertFromSerializedVis: sinon.fake(),
      convertToSerializedVis: sinon.fake(),
    },
    navigation: {
      ui: {
        TopNavMenu: mockComponent,
      },
    },
    charts: {
      theme: {
        chartsTheme$: mockObservable,
        useChartsTheme: sinon.fake(),
      },
    },
    discover: {
      docViews: {
        DocViewer: () => null,
      },
      savedSearchLoader: {},
    },
  },
};

export function __setup__(coreSetup) {
  npSetup.core = coreSetup;

  // no-op application register calls (this is overwritten to
  // bootstrap an LP plugin outside of tests)
  npSetup.core.application.register = () => {};

  npSetup.core.uiSettings.get = mockUiSettings.get;

  // Services that need to be set in the legacy platform since the legacy data
  // & vis plugins which previously provided them have been removed.
  setSetupServices(npSetup);
}

export function __start__(coreStart) {
  npStart.core = coreStart;

  npStart.core.uiSettings.get = mockUiSettings.get;

  // Services that need to be set in the legacy platform since the legacy data
  // & vis plugins which previously provided them have been removed.
  setStartServices(npStart);
}
