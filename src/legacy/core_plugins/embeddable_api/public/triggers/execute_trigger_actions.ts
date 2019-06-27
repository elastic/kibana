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
import { actionRegistry } from '../actions';
import { triggerRegistry } from '../triggers';
import { buildContextMenuForActions, openContextMenu } from '../context_menu_actions';
import { IEmbeddable } from '../embeddables';
import { getActionsForTrigger } from '../get_actions_for_trigger';

export async function executeTriggerActions(
  triggerId: string,
  {
    embeddable,
    triggerContext,
  }: {
    embeddable: IEmbeddable;
    triggerContext: any;
  }
) {
  const actions = await getActionsForTrigger(actionRegistry, triggerRegistry, triggerId, {
    embeddable,
  });

  if (actions.length > 1) {
    const closeMyContextMenuPanel = () => {
      session.close();
    };

    const panel = await buildContextMenuForActions({
      actions,
      actionContext: triggerContext,
      closeMenu: closeMyContextMenuPanel,
    });

    const session = openContextMenu([panel]);
  } else if (actions.length === 1) {
    const href = actions[0].getHref({
      embeddable,
      triggerContext,
    });
    if (href) {
      window.location.href = href;
    } else {
      actions[0].execute({ embeddable, triggerContext });
    }
  }
}
