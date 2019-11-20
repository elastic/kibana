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

const mockObservable = () => {
  return {
    subscribe: () => {}
  };
};

export const npSetup = {
  core: {
    chrome: {}
  },
  plugins: {
    embeddable: {
      registerEmbeddableFactory: sinon.fake(),
    },
    expressions: {
      registerFunction: sinon.fake(),
      registerRenderer: sinon.fake(),
      registerType: sinon.fake(),
      __LEGACY: {
        renderers: {
          register: () => undefined,
          get: () => null,
        },
        getExecutor: () => ({
          interpreter: {
            interpretAst: () => {},
          },
        }),
      },
    },
    data: {
      autocomplete: {
        addProvider: sinon.fake(),
        getProvider: sinon.fake(),
      },
      query: {
        filterManager: sinon.fake(),
        timefilter: {
          timefilter: sinon.fake(),
          history: sinon.fake(),
        }
      },
    },
    share: {
      register: () => {},
    },
    devTools: {
      register: () => {},
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
  },
};

let refreshInterval = undefined;
let isTimeRangeSelectorEnabled = true;
let isAutoRefreshSelectorEnabled = true;

export const npStart = {
  core: {
    chrome: {}
  },
  plugins: {
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
    devTools: {
      getSortedDevTools: () => [],
    },
    data: {
      autocomplete: {
        getProvider: sinon.fake(),
      },
      getSuggestions: sinon.fake(),
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
            getBounds: sinon.fake(),
            calculateBounds: sinon.fake(),
            createFilter: sinon.fake(),
          },
          history: sinon.fake(),
        },
      },
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
  },
};

export function __setup__(coreSetup) {
  npSetup.core = coreSetup;

  // no-op application register calls (this is overwritten to
  // bootstrap an LP plugin outside of tests)
  npSetup.core.application.register = () => {};
}

export function __start__(coreStart) {
  npStart.core = coreStart;
}
