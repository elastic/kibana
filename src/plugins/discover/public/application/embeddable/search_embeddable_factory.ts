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

import { auto } from 'angular';
import { i18n } from '@kbn/i18n';
import { UiActionsStart } from 'src/plugins/ui_actions/public';
import { getServices } from '../../kibana_services';
import {
  EmbeddableFactoryDefinition,
  Container,
  ErrorEmbeddable,
} from '../../../../embeddable/public';

import { TimeRange } from '../../../../data/public';

import { SearchInput, SearchOutput, SearchEmbeddable } from './types';
import { SEARCH_EMBEDDABLE_TYPE } from './constants';

interface StartServices {
  executeTriggerActions: UiActionsStart['executeTriggerActions'];
  isEditable: () => boolean;
}

export class SearchEmbeddableFactory
  implements EmbeddableFactoryDefinition<SearchInput, SearchOutput, SearchEmbeddable> {
  public readonly type = SEARCH_EMBEDDABLE_TYPE;
  private $injector: auto.IInjectorService | null;
  private getInjector: () => Promise<auto.IInjectorService> | null;
  public readonly savedObjectMetaData = {
    name: i18n.translate('discover.savedSearch.savedObjectName', {
      defaultMessage: 'Saved search',
    }),
    type: 'search',
    getIconForSavedObject: () => 'search',
  };

  constructor(
    private getStartServices: () => Promise<StartServices>,
    getInjector: () => Promise<auto.IInjectorService>
  ) {
    this.$injector = null;
    this.getInjector = getInjector;
  }

  public canCreateNew() {
    return false;
  }

  public isEditable = async () => {
    return (await this.getStartServices()).isEditable();
  };

  public getDisplayName() {
    return i18n.translate('discover.embeddable.search.displayName', {
      defaultMessage: 'search',
    });
  }

  public createFromSavedObject = async (
    savedObjectId: string,
    input: Partial<SearchInput> & { id: string; timeRange: TimeRange },
    parent?: Container
  ): Promise<SearchEmbeddable | ErrorEmbeddable> => {
    if (!this.$injector) {
      this.$injector = await this.getInjector();
    }
    const $injector = this.$injector as auto.IInjectorService;

    const $compile = $injector.get<ng.ICompileService>('$compile');
    const $rootScope = $injector.get<ng.IRootScopeService>('$rootScope');
    const filterManager = getServices().filterManager;

    const url = await getServices().getSavedSearchUrlById(savedObjectId);
    const editUrl = getServices().addBasePath(`/app/discover${url}`);
    try {
      const savedObject = await getServices().getSavedSearchById(savedObjectId);
      const indexPattern = savedObject.searchSource.getField('index');
      const { executeTriggerActions } = await this.getStartServices();
      const { SearchEmbeddable: SearchEmbeddableClass } = await import('./search_embeddable');
      return new SearchEmbeddableClass(
        {
          savedSearch: savedObject,
          $rootScope,
          $compile,
          editUrl,
          editPath: url,
          filterManager,
          editable: getServices().capabilities.discover.save as boolean,
          indexPatterns: indexPattern ? [indexPattern] : [],
        },
        input,
        executeTriggerActions,
        parent
      );
    } catch (e) {
      console.error(e); // eslint-disable-line no-console
      return new ErrorEmbeddable(e, input, parent);
    }
  };

  public async create(input: SearchInput) {
    return new ErrorEmbeddable('Saved searches can only be created from a saved object', input);
  }
}
