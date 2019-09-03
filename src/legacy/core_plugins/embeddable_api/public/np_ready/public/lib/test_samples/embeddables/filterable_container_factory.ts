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
import { Container, EmbeddableFactory } from '../..';
import {
  FilterableContainer,
  FilterableContainerInput,
  FILTERABLE_CONTAINER,
} from './filterable_container';
import { GetEmbeddableFactory } from '../../types';
import { EmbeddableFactoryOptions } from '../../embeddables/embeddable_factory';

export class FilterableContainerFactory extends EmbeddableFactory<FilterableContainerInput> {
  public readonly type = FILTERABLE_CONTAINER;

  constructor(
    private readonly getFactory: GetEmbeddableFactory,
    options: EmbeddableFactoryOptions<any> = {}
  ) {
    super(options);
  }

  public getDisplayName() {
    return i18n.translate('embeddableApi.samples.filterableContainer.displayName', {
      defaultMessage: 'filterable dashboard',
    });
  }

  public isEditable() {
    return true;
  }

  public async create(initialInput: FilterableContainerInput, parent?: Container) {
    return new FilterableContainer(initialInput, this.getFactory, parent);
  }
}
