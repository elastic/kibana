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
import { Container, EmbeddableFactoryDefinition } from '../..';
import {
  FilterableContainer,
  FilterableContainerInput,
  FILTERABLE_CONTAINER,
} from './filterable_container';
import { EmbeddableStart } from '../../../plugin';

export const createFilterableContainerFactory = (
  getFactory: EmbeddableStart['getEmbeddableFactory']
): EmbeddableFactoryDefinition<FilterableContainerInput> => ({
  type: FILTERABLE_CONTAINER,
  getDisplayName: () => {
    return i18n.translate('embeddableApi.samples.filterableContainer.displayName', {
      defaultMessage: 'filterable dashboard',
    });
  },

  isEditable: async () => {
    return true;
  },

  create: async (initialInput: FilterableContainerInput, parent?: Container) => {
    return new FilterableContainer(initialInput, getFactory, parent);
  },
});
