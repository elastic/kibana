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
import { trackUiMetric } from '../../../ui_metric/public';
import { Container, ContainerInput } from '../containers';
import { IEmbeddable } from '../embeddables';
import { APPLY_FILTER_TRIGGER, triggerRegistry } from '../triggers';
import { Filter } from '../types';
import { Action, ActionContext } from './action';
import { actionRegistry } from './action_registry';
import { IncompatibleActionError } from './incompatible_action_error';
import { IContainer } from '../containers/i_container';

interface ApplyFilterContainerInput extends ContainerInput {
  filters: Filter[];
}

const APPLY_FILTER_ACTION = 'APPLY_FILTER_ACTION';

function containerAcceptsFilterInput(
  container: IEmbeddable | IContainer | IContainer<ApplyFilterContainerInput>
): container is Container<any, ApplyFilterContainerInput> {
  return (container as Container<any, ApplyFilterContainerInput>).getInput().filters !== undefined;
}

export class ApplyFilterAction extends Action<IEmbeddable, { filters: Filter[] }> {
  public readonly type = APPLY_FILTER_ACTION;

  constructor() {
    super(APPLY_FILTER_ACTION);
  }

  public getDisplayName() {
    return i18n.translate('embeddableApi.actions.applyFilterActionTitle', {
      defaultMessage: 'Apply filter to current view',
    });
  }

  public isCompatible(context: ActionContext) {
    let root: IEmbeddable | IContainer = context.embeddable;
    while (root.parent) {
      root = root.parent;
    }

    return Promise.resolve(containerAcceptsFilterInput(root));
  }

  public execute({
    embeddable,
    triggerContext,
  }: ActionContext<IEmbeddable, { filters: Filter[] }>) {
    trackUiMetric('EmbeddableAPI', 'executeFilterAction');
    if (!triggerContext) {
      throw new Error('Applying a filter requires a filter as context');
    }
    let root: IEmbeddable | IContainer = embeddable;
    while (root.parent) {
      root = root.parent;
    }

    if (!containerAcceptsFilterInput(root)) {
      throw new IncompatibleActionError();
    }

    root.updateInput({
      filters: triggerContext.filters,
    });
  }
}

const applyFilterAction = new ApplyFilterAction();
if (!actionRegistry.getAction(applyFilterAction.id)) {
  actionRegistry.addAction(new ApplyFilterAction());
}

triggerRegistry.attachAction({
  triggerId: APPLY_FILTER_TRIGGER,
  actionId: APPLY_FILTER_ACTION,
});
