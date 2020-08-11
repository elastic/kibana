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

import { uniqBy } from 'lodash';
import { Action } from '../actions';
import { BaseContext } from '../types';
import { defer as createDefer, Defer } from '../../../kibana_utils/public';
import { buildContextMenuForActions, openContextMenu } from '../context_menu';
import { Trigger } from '../triggers';

interface ExecuteActionTask {
  action: Action;
  context: BaseContext;
  trigger: Trigger;
  defer: Defer<void>;
}

export class UiActionsExecutionService {
  private readonly batchingQueue: ExecuteActionTask[] = [];
  private readonly pendingTasks = new Set<ExecuteActionTask>();

  constructor() {}

  async execute({
    action,
    context,
    trigger,
  }: {
    action: Action<BaseContext>;
    context: BaseContext;
    trigger: Trigger;
  }): Promise<void> {
    const shouldBatch = !(await action.shouldAutoExecute?.(context)) ?? false;
    const task: ExecuteActionTask = {
      action,
      context,
      trigger,
      defer: createDefer(),
    };

    if (shouldBatch) {
      this.batchingQueue.push(task);
    } else {
      this.pendingTasks.add(task);
      try {
        await action.execute(context);
        this.pendingTasks.delete(task);
      } catch (e) {
        this.pendingTasks.delete(task);
        throw new Error(e);
      }
    }

    this.scheduleFlush();

    return task.defer.promise;
  }

  private scheduleFlush() {
    /**
     * Have to delay at least until next macro task
     * Otherwise chain:
     * Trigger -> await action.execute() -> trigger -> action
     * isn't batched
     *
     * This basically needed to support a chain of scheduled micro tasks (async/awaits) within uiActions code
     */
    setTimeout(() => {
      if (this.pendingTasks.size === 0) {
        const tasks = uniqBy(this.batchingQueue, (t) => t.action.id);
        if (tasks.length === 1) {
          this.executeSingleTask(tasks[0]);
        }
        if (tasks.length > 1) {
          this.executeMultipleActions(tasks);
        }

        this.batchingQueue.splice(0, this.batchingQueue.length);
      }
    }, 0);
  }

  private async executeSingleTask({ context, action, defer }: ExecuteActionTask) {
    try {
      await action.execute(context);
      defer.resolve();
    } catch (e) {
      defer.reject(e);
    }
  }

  private async executeMultipleActions(tasks: ExecuteActionTask[]) {
    const panel = await buildContextMenuForActions({
      actions: tasks.map(({ action, context }) => [action, context]),
      title: tasks[0].trigger.title, // title of context menu is title of trigger which originated the chain
      closeMenu: () => {
        tasks.forEach((t) => t.defer.resolve());
        session.close();
      },
    });
    const session = openContextMenu([panel], {
      'data-test-subj': 'multipleActionsContextMenu',
    });
  }
}
