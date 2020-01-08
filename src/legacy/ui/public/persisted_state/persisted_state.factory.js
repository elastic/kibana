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

/**
 * @name AngularPersistedState
 *
 * Returns a PersistedState object which uses an EventEmitter instead of
 * the SimpleEmitter. The EventEmitter adds digest loops every time a handler is called
 * so it's preferable to use this variation when a callback modifies angular UI.
 *
 * TODO: The handlers themselves should really be responsible for triggering digest loops
 * as opposed to having an all or nothing situation. A nice goal would be to get rid
 * of the EventEmitter entirely and require handlers that need it to trigger a digest loop
 * themselves. We can even supply a service to wrap the callbacks in a function that
 * would call the callback, and finish with a $rootScope.$apply().
 */

import { EventsProvider } from '../events';
import { PersistedState } from './persisted_state';
import { uiModules } from '../modules';

const module = uiModules.get('kibana');

module.factory('PersistedState', $injector => {
  const Private = $injector.get('Private');
  const Events = Private(EventsProvider);

  // Extend PersistedState to override the EmitterClass class with
  // our Angular friendly version.
  return class AngularPersistedState extends PersistedState {
    constructor(value, path) {
      super(value, path, Events);
    }
  };
});
