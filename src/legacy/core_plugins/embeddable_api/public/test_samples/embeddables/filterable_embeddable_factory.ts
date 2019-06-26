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
import {
  FilterableEmbeddable,
  FilterableEmbeddableInput,
  FILTERABLE_EMBEDDABLE,
} from './filterable_embeddable';
import { embeddableFactories, EmbeddableFactory } from '../../embeddables';
import { IContainer } from '../../containers';

export class FilterableEmbeddableFactory extends EmbeddableFactory<FilterableEmbeddableInput> {
  public readonly type = FILTERABLE_EMBEDDABLE;

  public isEditable() {
    return true;
  }

  public getDisplayName() {
    return i18n.translate('embeddableApi.samples.filterableEmbeddable.displayName', {
      defaultMessage: 'filterable',
    });
  }

  public async create(initialInput: FilterableEmbeddableInput, parent?: IContainer) {
    return new FilterableEmbeddable(initialInput, parent);
  }
}

embeddableFactories.set(FILTERABLE_EMBEDDABLE, new FilterableEmbeddableFactory());
