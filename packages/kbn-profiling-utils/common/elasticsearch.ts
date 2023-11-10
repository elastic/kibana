/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UnionToIntersection, ValuesType } from 'utility-types';

/**
 * Profiling Elasticsearch fields
 */
export enum ProfilingESField {
  Timestamp = '@timestamp',
  ContainerName = 'container.name',
  ProcessThreadName = 'process.thread.name',
  StacktraceCount = 'Stacktrace.count',
  HostID = 'host.id',
  HostName = 'host.name',
  HostIP = 'host.ip',
  OrchestratorResourceName = 'orchestrator.resource.name',
  ServiceName = 'service.name',
  StacktraceID = 'Stacktrace.id',
  StacktraceFrameIDs = 'Stacktrace.frame.ids',
  StacktraceFrameTypes = 'Stacktrace.frame.types',
  StackframeFileName = 'Stackframe.file.name',
  StackframeFunctionName = 'Stackframe.function.name',
  StackframeLineNumber = 'Stackframe.line.number',
  StackframeFunctionOffset = 'Stackframe.function.offset',
  ExecutableBuildID = 'Executable.build.id',
  ExecutableFileName = 'Executable.file.name',
}

type DedotKey<
  TKey extends string | number | symbol,
  TValue
> = TKey extends `${infer THead}.${infer TTail}`
  ? {
      [key in THead]: DedotKey<TTail, TValue>;
    }
  : { [key in TKey]: TValue };

export type DedotObject<TObject extends Record<string, any>> = UnionToIntersection<
  ValuesType<{
    [TKey in keyof TObject]: DedotKey<TKey, TObject[TKey]>;
  }>
>;

export type FlattenObject<
  TObject extends Record<string, any>,
  TPrefix extends string = ''
> = UnionToIntersection<
  ValuesType<{
    [TKey in keyof TObject & string]: TObject[TKey] extends Record<string, any>
      ? FlattenObject<TObject[TKey], `${TPrefix}${TKey}.`>
      : { [key in `${TPrefix}${TKey}`]: TObject[TKey] };
  }>
>;

type FlattenedKeysOf<TObject extends Record<string, any>> = keyof FlattenObject<TObject>;

export type PickFlattened<
  TObject extends Record<string, any>,
  TPickKey extends FlattenedKeysOf<TObject>
> = DedotObject<Pick<FlattenObject<TObject>, TPickKey>>;

export type ProfilingESEvent = DedotObject<{
  [ProfilingESField.Timestamp]: string;
  [ProfilingESField.ContainerName]: string;
  [ProfilingESField.ProcessThreadName]: string;
  [ProfilingESField.StacktraceCount]: number;
  [ProfilingESField.HostID]: string;
  [ProfilingESField.OrchestratorResourceName]: string;
  [ProfilingESField.ServiceName]: string;
  [ProfilingESField.StacktraceID]: string;
}>;

export type ProfilingStackTrace = DedotObject<{
  [ProfilingESField.StacktraceFrameIDs]: string;
  [ProfilingESField.StacktraceFrameTypes]: string;
}>;

export type ProfilingStackFrame = DedotObject<{
  [ProfilingESField.StackframeFileName]: string;
  [ProfilingESField.StackframeFunctionName]: string;
  [ProfilingESField.StackframeLineNumber]: number;
  [ProfilingESField.StackframeFunctionOffset]: number;
}>;

export type ProfilingExecutable = DedotObject<{
  [ProfilingESField.ExecutableBuildID]: string;
  [ProfilingESField.ExecutableFileName]: string;
}>;
