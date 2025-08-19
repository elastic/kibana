/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface TaskHandler {
  id: string;
  handler: (data: any) => Promise<any> | any;
  options?: {
    timeout?: number;
    retry?: boolean;
    maxRetries?: number;
  };
}

export interface TaskMessage {
  type: 'TASK_EXECUTE' | 'TASK_REGISTER' | 'TASK_UNREGISTER';
  taskId: string;
  data?: any;
  requestId?: string;
}

export class ServiceWorkerTaskFramework {
  private tasks = new Map<string, TaskHandler>();
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();

  constructor() {
    this.setupMessageHandler();
  }

  /**
   * Register a task handler
   */
  registerTask(task: TaskHandler): void {
    this.tasks.set(task.id, task);
    console.log(`Task registered: ${task.id}`);
  }

  /**
   * Unregister a task handler
   */
  unregisterTask(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  /**
   * Execute a task by ID
   */
  async executeTask(taskId: string, data?: any): Promise<any> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const timeout = task.options?.timeout || 30000; // 30s default
    const maxRetries = task.options?.maxRetries || 0;
    let retries = 0;

    while (retries <= maxRetries) {
      try {
        return await Promise.race([
          Promise.resolve(task.handler(data)),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Task timeout')), timeout)),
        ]);
      } catch (error) {
        if (retries === maxRetries || !task.options?.retry) {
          throw error;
        }
        retries++;
        console.warn(`Task ${taskId} failed, retrying (${retries}/${maxRetries})`);
      }
    }
  }

  /**
   * Setup message handler for communication with main thread
   */
  private setupMessageHandler(): void {
    self.addEventListener('message', async (event) => {
      const message: TaskMessage = event.data;

      try {
        switch (message.type) {
          case 'TASK_EXECUTE':
            const result = await this.executeTask(message.taskId, message.data);
            this.postMessage(
              {
                type: 'TASK_RESULT',
                requestId: message.requestId,
                result,
              },
              event.source
            );
            break;

          case 'TASK_REGISTER':
            // Dynamic task registration from main thread
            if (message.data && message.data.handler) {
              this.registerTask({
                id: message.taskId,
                handler: new Function('data', message.data.handler),
                options: message.data.options,
              });
            }
            break;

          case 'TASK_UNREGISTER':
            this.unregisterTask(message.taskId);
            break;
        }
      } catch (error) {
        this.postMessage(
          {
            type: 'TASK_ERROR',
            requestId: message.requestId,
            error: error instanceof Error ? error.message : String(error),
          },
          event.source
        );
      }
    });
  }

  /**
   * Post message back to main thread
   */
  private postMessage(message: any, source: any): void {
    if (source && source.postMessage) {
      source.postMessage(message);
    } else {
      // Broadcast to all clients
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage(message));
      });
    }
  }
}
