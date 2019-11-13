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
import { IPrivate } from 'ui/private';
import { i18n } from '@kbn/i18n';
import { TExecuteTriggerActions } from 'src/plugins/ui_actions/public';
import '../angular/doc_table';
import { getServices } from '../kibana_services';
import {
  EmbeddableFactory,
  ErrorEmbeddable,
  Container,
} from '../../../../../../plugins/embeddable/public';
import { TimeRange } from '../../../../../../plugins/data/public';
import { SavedSearchLoader } from '../types';
import { SearchEmbeddable } from './search_embeddable';
import { SearchInput, SearchOutput } from './types';
import { SEARCH_EMBEDDABLE_TYPE } from './constants';

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
    return getServices().capabilities.discover.save as boolean;
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
    const $injector = await getServices().getInjector();

    const $compile = $injector.get<ng.ICompileService>('$compile');
    const $rootScope = $injector.get<ng.IRootScopeService>('$rootScope');
    const searchLoader = $injector.get<SavedSearchLoader>('savedSearches');
    const editUrl = await getServices().addBasePath(
      `/app/kibana${searchLoader.urlFor(savedObjectId)}`
    );

    const Private = $injector.get<IPrivate>('Private');

    const queryFilter = Private(getServices().FilterBarQueryFilterProvider);
    try {
      const savedObject = await searchLoader.get(savedObjectId);
      return new SearchEmbeddable(
        {
          savedSearch: savedObject,
          $rootScope,
          $compile,
          editUrl,
          queryFilter,
          editable: getServices().capabilities.discover.save as boolean,
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

const factory = new SearchEmbeddableFactory(getServices().uiActions.executeTriggerActions);
getServices().embeddable.registerEmbeddableFactory(factory.type, factory);
