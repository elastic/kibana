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
import chromeLegacy from 'ui/chrome';
import { IPrivate } from 'ui/private';
import { getUnhashableStatesProvider } from 'ui/state_management/state_hashing/get_unhashable_states_provider';
import { ShareContextMenuExtensionsRegistryProvider } from 'ui/share';
// @ts-ignore
import { StateProvider } from 'ui/state_management/state';
// @ts-ignore
import { createSavedSearchesService } from './saved_searches/saved_searches';
// @ts-ignore
import { createSavedSearchFactory } from './saved_searches/_saved_search';

export interface AngularGlobalInjectedDependencies {
  getSavedSearchById: any;
  getSavedSearchUrlById: any;
  getUnhashableStates: any;
  shareContextMenuExtensions: any;
  State: any;
}

/**
 * Get dependencies relying on the global angular context.
 * They also have to get resolved together with the legacy imports
 */
export async function getGlobalAngular(): Promise<AngularGlobalInjectedDependencies> {
  const injector = await chromeLegacy.dangerouslyGetActiveInjector();
  const Private = injector.get<IPrivate>('Private');
  const kbnUrl = injector.get<IPrivate>('kbnUrl');
  const getUnhashableStates = Private(getUnhashableStatesProvider);
  const shareContextMenuExtensions = Private(ShareContextMenuExtensionsRegistryProvider);
  const State = Private(StateProvider);
  const SavedSearch = createSavedSearchFactory(Private);
  const service = createSavedSearchesService(Private, SavedSearch, kbnUrl, chromeLegacy);

  return {
    getSavedSearchById: async (id: string) => {
      return service.get(id);
    },
    getSavedSearchUrlById: async (id: string) => {
      return service.urlFor(id);
    },
    getUnhashableStates,
    shareContextMenuExtensions,
    State,
  };
}
