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

export const npSetup = {
  core: {
    chrome: {},
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
      },
    },
    data: {},
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

export const npStart = {
  core: {
    chrome: {},
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
    data: {
      getSuggestions: sinon.fake(),
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
}

export function __start__(coreStart) {
  npStart.core = coreStart;
}
