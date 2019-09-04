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
import { Filter } from '@kbn/es-query';
import { IEmbeddable, EmbeddableInput } from '../embeddables';
import { Action } from './action';
import { IncompatibleActionError } from '../errors';

export const APPLY_FILTER_ACTION = 'APPLY_FILTER_ACTION';

type RootEmbeddable = IEmbeddable<EmbeddableInput & { filters: Filter[] }>;
interface ActionContext {
  embeddable: IEmbeddable;
  filters: Filter[];
}

export class ApplyFilterAction extends Action<ActionContext> {
  public readonly type = APPLY_FILTER_ACTION;

  constructor() {
    super(APPLY_FILTER_ACTION);
  }

  public getDisplayName() {
    return i18n.translate('embeddableApi.actions.applyFilterActionTitle', {
      defaultMessage: 'Apply filter to current view',
    });
  }

  public async isCompatible(context: ActionContext) {
    if (context.embeddable === undefined) {
      return false;
    }
    const root = context.embeddable.getRoot() as RootEmbeddable;
    return Boolean(root.getInput().filters !== undefined && context.filters !== undefined);
  }

  public async execute({ embeddable, filters }: ActionContext) {
    if (!filters || !embeddable) {
      throw new Error('Applying a filter requires a filter and embeddable as context');
    }

    if (!(await this.isCompatible({ embeddable, filters }))) {
      throw new IncompatibleActionError();
    }

    const root = embeddable.getRoot() as RootEmbeddable;

    root.updateInput({
      filters,
    });
  }
}
