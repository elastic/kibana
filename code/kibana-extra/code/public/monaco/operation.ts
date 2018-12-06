/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AsyncTask, Computer } from './computer';

enum OperationState {
  IDLE,
  DELAYED,
  RUNNING,
}

export class Operation<T> {
  public static DEFAULT_DELAY_TIME = 300;
  private task: AsyncTask<T> | null = null;
  private state: OperationState = OperationState.IDLE;
  private delay: number = Operation.DEFAULT_DELAY_TIME;
  private timeout: any;

  constructor(
    readonly computer: Computer<T>,
    readonly successCallback: (result: T) => void,
    readonly errorCallback: (error: Error) => void,
    readonly progressCallback: (progress: any) => void
  ) {}

  public setDelay(delay: number) {
    this.delay = delay;
  }

  public start() {
    if (this.state === OperationState.IDLE) {
      this.task = this.computer.compute();
      this.triggerDelay();
    }
  }

  public triggerDelay() {
    this.cancelDelay();
    this.timeout = setTimeout(this.triggerAsyncTask.bind(this), this.delay);
    this.state = OperationState.DELAYED;
  }

  public cancel() {
    if (this.state === OperationState.RUNNING) {
      if (this.task) {
        this.task.cancel();
        this.task = null;
      }
    } else if (this.state === OperationState.DELAYED) {
      this.cancelDelay();
    }
    this.state = OperationState.IDLE;
  }

  private cancelDelay() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  private showLoading() {
    this.progressCallback(this.computer.loadingMessage());
  }

  private triggerAsyncTask() {
    if (this.task) {
      this.state = OperationState.RUNNING;
      const loadingDelay = setTimeout(this.showLoading.bind(this), this.delay);

      const task = this.task;
      task.promise().then(
        result => {
          clearTimeout(loadingDelay);
          if (task === this.task) {
            this.successCallback(result);
          }
        },
        error => {
          clearTimeout(loadingDelay);
          if (task === this.task) {
            this.errorCallback(error);
          }
        }
      );
    }
  }
}
