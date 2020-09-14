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
import { ActionByType, createAction, IncompatibleActionError } from '../ui_actions';
import { IEmbeddable, EmbeddableInput } from '../embeddables';
import { Filter } from '../../../../../plugins/data/public';

export const ACTION_APPLY_FILTER = 'ACTION_APPLY_FILTER';

type RootEmbeddable = IEmbeddable<EmbeddableInput & { filters: Filter[] }>;
export interface FilterActionContext {
  embeddable: IEmbeddable;
  filters: Filter[];
}

async function isCompatible(context: FilterActionContext) {
  if (context.embeddable === undefined) {
    return false;
  }
  const root = context.embeddable.getRoot() as RootEmbeddable;
  return Boolean(root.getInput().filters !== undefined && context.filters !== undefined);
}

export function createFilterAction(): ActionByType<typeof ACTION_APPLY_FILTER> {
  return createAction<typeof ACTION_APPLY_FILTER>({
    type: ACTION_APPLY_FILTER,
    id: ACTION_APPLY_FILTER,
    order: 100,
    getIconType: () => 'filter',
    getDisplayName: () => {
      return i18n.translate('embeddableApi.actions.applyFilterActionTitle', {
        defaultMessage: 'Apply filter to current view',
      });
    },
    isCompatible,
    execute: async ({ embeddable, filters }) => {
      if (!filters || !embeddable) {
        throw new Error('Applying a filter requires a filter and embeddable as context');
      }

      if (!(await isCompatible({ embeddable, filters }))) {
        throw new IncompatibleActionError();
      }

      const root = embeddable.getRoot() as RootEmbeddable;

      root.updateInput({
        filters,
      });
    },
  });
}
