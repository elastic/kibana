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

import '../doc_table';
import { capabilities } from 'ui/capabilities';
import { i18n } from '@kbn/i18n';
import {
  embeddableFactories,
  EmbeddableFactory,
  ErrorEmbeddable,
  triggerRegistry,
  Container,
} from 'plugins/embeddable_api/index';
import chrome from 'ui/chrome';
import { SavedSearchLoader } from '../types';
import { SearchEmbeddable, SearchInput, SearchOutput } from './search_embeddable';

export const SEARCH_EMBEDDABLE_TYPE = 'search';

export const SEARCH_OUTPUT_SPEC = {
  ['title']: {
    displayName: 'Title',
    description: 'The title of the element',
    accessPath: 'element.title',
    id: 'title',
  },
  ['timeRange']: {
    displayName: 'Time range',
    description: 'The time range. Object type that has from and to nested properties.',
    accessPath: 'element.timeRange',
    id: 'timeRange',
  },
  ['filters']: {
    displayName: 'Filters',
    description: 'The filters applied to the current view',
    accessPath: 'element.filters',
    id: 'filters',
  },
  ['query']: {
    displayName: 'Query',
    description: 'The query applied to the current view',
    accessPath: 'element.query',
    id: 'query',
  },
};

export class SearchEmbeddableFactory extends EmbeddableFactory<
  SearchInput,
  SearchOutput,
  SearchEmbeddable
> {
  constructor() {
    super({
      name: SEARCH_EMBEDDABLE_TYPE,
      savedObjectMetaData: {
        name: i18n.translate('kbn.discover.savedSearch.savedObjectName', {
          defaultMessage: 'Saved search',
        }),
        type: 'search',
        getIconForSavedObject: () => 'search',
      },
    });
  }

  public getOutputSpec() {
    return SEARCH_OUTPUT_SPEC;
  }

  /**
   *
   * @param panelMetadata. Currently just passing in panelState but it's more than we need, so we should
   * decouple this to only include data given to us from the embeddable when it's added to the dashboard. Generally
   * will be just the object id, but could be anything depending on the plugin.
   * @param onEmbeddableStateChanged
   * @return
   */
  public async createFromSavedObject(
    savedObjectId: string,
    input: Partial<SearchInput> & { id: string },
    parent?: Container
  ): Promise<SearchEmbeddable | ErrorEmbeddable> {
    const $injector = await chrome.dangerouslyGetActiveInjector();

    const $compile = $injector.get<ng.ICompileService>('$compile');
    const $rootScope = $injector.get<ng.IRootScopeService>('$rootScope');
    const courier = $injector.get<unknown>('courier');
    const searchLoader = $injector.get<SavedSearchLoader>('savedSearches');

    const editUrl = chrome.addBasePath(`/app/kibana${searchLoader.urlFor(savedObjectId)}`);

    // can't change this to be async / awayt, because an Anglular promise is expected to be returned.
    return searchLoader
      .get(savedObjectId)
      .then(savedObject => {
        return new SearchEmbeddable(
          {
            courier,
            savedSearch: savedObject,
            $rootScope,
            $compile,
            editUrl,
            editable: capabilities.get().discover.save as boolean,
            title: savedObject.title,
            indexPatterns: _.compact([savedObject.searchSource.getField('index')]),
          },
          input,
          parent
        );
      })
      .catch((e: Error) => {
        console.error(e); // eslint-disable-line no-console
        return new ErrorEmbeddable(e, input.id);
      });
  }

  public async create(input: SearchInput) {
    return Promise.resolve(
      new ErrorEmbeddable('Saved searches can only be created from a saved object', input.id)
    );
  }
}

embeddableFactories.registerFactory(new SearchEmbeddableFactory());

export const SEARCH_ROW_CLICK_TRIGGER = 'SEARCH_ROW_CLICK_TRIGGER';

triggerRegistry.registerTrigger({
  id: SEARCH_ROW_CLICK_TRIGGER,
  title: 'On row click',
  actionIds: [],
});
