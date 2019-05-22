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

// eslint-disable max-classes-per-file

import * as Rx from 'rxjs';

import { ToolingLogWriter, WriterConfig } from './tooling_log_text_writer';

export interface LogMessage {
  type: 'verbose' | 'debug' | 'info' | 'success' | 'warning' | 'error' | 'write';
  indent: number;
  args: any[];
}

export class ToolingLog {
  constructor(config?: WriterConfig);
  public verbose(...args: any[]): void;
  public debug(...args: any[]): void;
  public info(...args: any[]): void;
  public success(...args: any[]): void;
  public warning(...args: any[]): void;
  public error(errOrMsg: string | Error): void;
  public write(...args: any[]): void;
  public indent(spaces?: number): void;
  public getWriters(): ToolingLogWriter[];
  public setWriters(reporters: ToolingLogWriter[]): void;
  public getWritten$(): Rx.Observable<LogMessage>;
}
