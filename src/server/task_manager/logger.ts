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

export type LogFn = (prefix: string[], msg: string) => void;

type SimpleLogFn = (msg: string) => void;

export interface Logger {
  error: SimpleLogFn;
  warning: SimpleLogFn;
  debug: SimpleLogFn;
  info: SimpleLogFn;
}

export class TaskManagerLogger implements Logger {
  private write: LogFn;

  constructor(log: LogFn) {
    this.write = log;
  }

  public error(msg: string) {
    this.log('error', msg);
  }

  public warning(msg: string) {
    this.log('warning', msg);
  }

  public debug(msg: string) {
    this.log('debug', msg);
  }

  public info(msg: string) {
    this.log('info', msg);
  }

  private log(type: string, msg: string) {
    this.write([type, 'task_manager'], msg);
  }
}
