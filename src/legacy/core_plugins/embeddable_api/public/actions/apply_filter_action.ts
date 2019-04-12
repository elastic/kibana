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

import { Container, ContainerInput } from '../containers';
import { EmbeddableInput, Embeddable, EmbeddableOutput } from '../embeddables';
import { APPLY_FILTER_TRIGGER, triggerRegistry } from '../triggers';
import { Filter } from '../types';
import { Action } from './action';
import { actionRegistry } from './action_registry';

interface ApplyFilterContainerInput extends ContainerInput {
  filters: Filter[];
}

const APPLY_FILTER_ACTION_ID = 'APPLY_FILTER_ACTION_ID';

function containerAcceptsFilterInput(
  container: Embeddable | Container<{ id: string }, {}, ApplyFilterContainerInput>
): container is Container<{ id: string }, {}, ApplyFilterContainerInput> {
  return (
    (container as Container<{ id: string }, {}, ApplyFilterContainerInput>).getInput().filters !==
    undefined
  );
}

export class ApplyFilterAction extends Action<
  Embeddable,
  Container<EmbeddableInput, EmbeddableOutput, ApplyFilterContainerInput>,
  { filters: Filter[] }
> {
  constructor() {
    super(APPLY_FILTER_ACTION_ID);
  }

  public getTitle() {
    return 'Apply filter to current view';
  }

  public isCompatible(context: { embeddable: Embeddable }) {
    let root = context.embeddable;
    while (root.parent) {
      root = root.parent;
    }

    return Promise.resolve(containerAcceptsFilterInput(root));
  }

  public execute({
    embeddable,
    triggerContext,
  }: {
    embeddable: Embeddable;
    triggerContext?: { filters: Filter[] };
  }) {
    if (!triggerContext) {
      throw new Error('Applying a filter requires a filter as context');
    }
    let root = embeddable;
    while (root.parent) {
      root = root.parent;
    }
    (root as Container<{ id: string }, {}, ApplyFilterContainerInput>).updateInput({
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
  actionId: APPLY_FILTER_ACTION_ID,
});
