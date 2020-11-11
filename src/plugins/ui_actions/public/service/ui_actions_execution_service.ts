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
  alwaysShowPopup?: boolean;
}

export class UiActionsExecutionService {
  private readonly batchingQueue: ExecuteActionTask[] = [];
  private readonly pendingTasks = new Set<ExecuteActionTask>();

  constructor() {}

  async execute(
    {
      action,
      context,
      trigger,
    }: {
      action: Action<BaseContext>;
      context: BaseContext;
      trigger: Trigger;
    },
    alwaysShowPopup?: boolean
  ): Promise<void> {
    const shouldBatch = !(await action.shouldAutoExecute?.({ ...context, trigger })) ?? false;
    const task: ExecuteActionTask = {
      action,
      context,
      trigger,
      defer: createDefer(),
      alwaysShowPopup: !!alwaysShowPopup,
    };

    if (shouldBatch) {
      this.batchingQueue.push(task);
    } else {
      this.pendingTasks.add(task);
      try {
        await action.execute({ ...context, trigger });
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
        if (tasks.length > 0) {
          let alwaysShowPopup = false;
          for (const task of tasks) {
            if (task.alwaysShowPopup) {
              alwaysShowPopup = true;
              break;
            }
          }
          if (alwaysShowPopup) {
            this.executeMultipleActions(tasks);
          } else {
            if (tasks.length === 1) {
              this.executeSingleTask(tasks[0]);
            }
            if (tasks.length > 1) {
              this.executeMultipleActions(tasks);
            }
          }
        }

        this.batchingQueue.splice(0, this.batchingQueue.length);
      }
    }, 0);
  }

  private async executeSingleTask({ context, action, defer, trigger }: ExecuteActionTask) {
    try {
      await action.execute({
        ...context,
        trigger,
      });
      defer.resolve();
    } catch (e) {
      defer.reject(e);
    }
  }

  private async executeMultipleActions(tasks: ExecuteActionTask[]) {
    const panels = await buildContextMenuForActions({
      actions: tasks.map(({ action, context, trigger }) => ({
        action,
        context,
        trigger,
      })),
      title: '', // intentionally don't have any title
      closeMenu: () => {
        tasks.forEach((t) => t.defer.resolve());
        session.close();
      },
    });
    const session = openContextMenu(panels, {
      'data-test-subj': 'multipleActionsContextMenu',
    });
  }
}
