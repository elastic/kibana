/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { uniqBy } from 'lodash';
import { Action } from '../actions';
import { defer as createDefer, Defer } from '../../../kibana_utils/public';
import { buildContextMenuForActions, openContextMenu } from '../context_menu';
import { Trigger } from '../triggers';

interface ExecuteActionTask {
  action: Action;
  context: object;
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
      action: Action;
      context: object;
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
            this.showActionPopupMenu(tasks);
          } else {
            if (tasks.length === 1) {
              this.executeSingleTask(tasks[0]);
            } else if (tasks.length > 1) {
              this.showActionPopupMenu(tasks);
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

  private async showActionPopupMenu(tasks: ExecuteActionTask[]) {
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
