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
import { npStart } from 'ui/new_platform';
import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';
import { IPrivate } from 'ui/private';
import { TimeRange } from 'src/plugins/data/public';
import { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';
import { TExecuteTriggerActions } from 'src/plugins/ui_actions/public';
import {
  EmbeddableFactory,
  ErrorEmbeddable,
  Container,
} from '../../../../embeddable_api/public/np_ready/public';
import { setup } from '../../../../embeddable_api/public/np_ready/public/legacy';
import { SavedSearchLoader } from '../types';
import { SearchEmbeddable, SEARCH_EMBEDDABLE_TYPE } from './search_embeddable';
import { SearchInput, SearchOutput } from './types';

export class SearchEmbeddableFactory extends EmbeddableFactory<
  SearchInput,
  SearchOutput,
  SearchEmbeddable
> {
  public readonly type = SEARCH_EMBEDDABLE_TYPE;

  constructor(private readonly executeTriggerActions: TExecuteTriggerActions) {
    super({
      savedObjectMetaData: {
        name: i18n.translate('kbn.discover.savedSearch.savedObjectName', {
          defaultMessage: 'Saved search',
        }),
        type: 'search',
        getIconForSavedObject: () => 'search',
      },
    });
  }

  public isEditable() {
    return capabilities.get().discover.save as boolean;
  }

  public canCreateNew() {
    return false;
  }

  public getDisplayName() {
    return i18n.translate('kbn.embeddable.search.displayName', {
      defaultMessage: 'search',
    });
  }

  public async createFromSavedObject(
    savedObjectId: string,
    input: Partial<SearchInput> & { id: string; timeRange: TimeRange },
    parent?: Container
  ): Promise<SearchEmbeddable | ErrorEmbeddable> {
    const $injector = await chrome.dangerouslyGetActiveInjector();

    const $compile = $injector.get<ng.ICompileService>('$compile');
    const $rootScope = $injector.get<ng.IRootScopeService>('$rootScope');
    const searchLoader = $injector.get<SavedSearchLoader>('savedSearches');
    const editUrl = chrome.addBasePath(`/app/kibana${searchLoader.urlFor(savedObjectId)}`);

    const Private = $injector.get<IPrivate>('Private');

    const queryFilter = Private(FilterBarQueryFilterProvider);
    try {
      const savedObject = await searchLoader.get(savedObjectId);
      return new SearchEmbeddable(
        {
          savedSearch: savedObject,
          $rootScope,
          $compile,
          editUrl,
          queryFilter,
          editable: capabilities.get().discover.save as boolean,
          indexPatterns: _.compact([savedObject.searchSource.getField('index')]),
        },
        input,
        this.executeTriggerActions,
        parent
      );
    } catch (e) {
      console.error(e); // eslint-disable-line no-console
      return new ErrorEmbeddable(e, input, parent);
    }
  }

  public async create(input: SearchInput) {
    return new ErrorEmbeddable('Saved searches can only be created from a saved object', input);
  }
}

const factory = new SearchEmbeddableFactory(npStart.plugins.uiActions.executeTriggerActions);
setup.registerEmbeddableFactory(factory.type, factory);
