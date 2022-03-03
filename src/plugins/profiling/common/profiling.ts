/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type StackTraceID = string;
export type StackFrameID = string;
export type FileID = string;

export interface StackTraceEvent {
  StackTraceID: StackTraceID;
  Count: number;
}

export interface StackTrace {
  FileID: string[];
  FrameID: string[];
  Type: string[];
}

export interface StackFrame {
  FileName: string;
  FunctionName: string;
  FunctionOffset: number;
  LineNumber: number;
  SourceType: number;
}

export interface Executable {
  FileName: string;
}
