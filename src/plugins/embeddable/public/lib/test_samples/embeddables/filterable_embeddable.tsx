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

import { IContainer } from '../../containers';
import { EmbeddableOutput, EmbeddableInput, Embeddable } from '../../embeddables';
import { esFilters } from '../../../../../data/public';

export const FILTERABLE_EMBEDDABLE = 'FILTERABLE_EMBEDDABLE';

export interface FilterableEmbeddableInput extends EmbeddableInput {
  filters: esFilters.Filter[];
}

export class FilterableEmbeddable extends Embeddable<FilterableEmbeddableInput, EmbeddableOutput> {
  public readonly type = FILTERABLE_EMBEDDABLE;
  constructor(initialInput: FilterableEmbeddableInput, parent?: IContainer) {
    super(initialInput, {}, parent);
  }

  public getInspectorAdapters(): Record<string, string> {
    const inspectorAdapters: Record<string, string> = {
      filters: `My filters are ${JSON.stringify(this.input.filters)}`,
    };
    return inspectorAdapters;
  }

  public render() {}

  public reload() {}
}
