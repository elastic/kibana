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
import { i18n } from '@kbn/i18n';
import { TExecuteTriggerActions } from 'src/plugins/ui_actions/public';
import { IInjector } from 'ui/chrome';
import { getServices } from '../kibana_services';
import {
  EmbeddableFactory,
  ErrorEmbeddable,
  Container,
} from '../../../../../../plugins/embeddable/public';

import { TimeRange } from '../../../../../../plugins/data/public';
import { SearchEmbeddable } from './search_embeddable';
import { SearchInput, SearchOutput } from './types';
import { SEARCH_EMBEDDABLE_TYPE } from './constants';

export class SearchEmbeddableFactory extends EmbeddableFactory<
  SearchInput,
  SearchOutput,
  SearchEmbeddable
> {
  public readonly type = SEARCH_EMBEDDABLE_TYPE;
  private $injector: IInjector | null;
  private getInjector: () => Promise<IInjector> | null;
  public isEditable: () => boolean;

  constructor(
    private readonly executeTriggerActions: TExecuteTriggerActions,
    getInjector: () => Promise<IInjector>,
    isEditable: () => boolean
  ) {
    super({
      savedObjectMetaData: {
        name: i18n.translate('kbn.discover.savedSearch.savedObjectName', {
          defaultMessage: 'Saved search',
        }),
        type: 'search',
        getIconForSavedObject: () => 'search',
      },
    });
    this.$injector = null;
    this.getInjector = getInjector;
    this.isEditable = isEditable;
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
    if (!this.$injector) {
      this.$injector = await this.getInjector();
    }
    const $injector = this.$injector as IInjector;

    const $compile = $injector.get<ng.ICompileService>('$compile');
    const $rootScope = $injector.get<ng.IRootScopeService>('$rootScope');
    const filterManager = getServices().filterManager;

    const url = await getServices().getSavedSearchUrlById(savedObjectId);
    const editUrl = getServices().addBasePath(`/app/kibana${url}`);
    try {
      const savedObject = await getServices().getSavedSearchById(savedObjectId);
      const indexPattern = savedObject.searchSource.getField('index');
      return new SearchEmbeddable(
        {
          savedSearch: savedObject,
          $rootScope,
          $compile,
          editUrl,
          filterManager,
          editable: getServices().capabilities.discover.save as boolean,
          indexPatterns: indexPattern ? [indexPattern] : [],
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
