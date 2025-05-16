/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { decodeStackTraceResponse } from './common/stack_traces';
export { createFlameGraph } from './common/flamegraph';
export { ProfilingESField } from './common/elasticsearch';
export {
  groupStackFrameMetadataByStackTrace,
  describeFrameType,
  normalizeFrameType,
  FrameType,
  getCalleeFunction,
  getCalleeSource,
  getLanguageType,
  FrameSymbolStatus,
  getFrameSymbolStatus,
  createStackFrameMetadata,
  emptyExecutable,
  emptyStackFrame,
  emptyStackTrace,
} from './common/profiling';
export { getFieldNameForTopNType, TopNType, StackTracesDisplayOption } from './common/stack_traces';
export { createFrameGroupID } from './common/frame_group';
export {
  createTopNFunctions,
  TopNFunctionSortField,
  topNFunctionSortFieldRt,
  TopNComparisonFunctionSortField,
  topNComparisonFunctionSortFieldRt,
} from './common/functions';
export { convertTonsToKgs } from './common/utils';

export type {
  ProfilingStatusResponse,
  StackTraceResponse,
  DecodedStackTraceResponse,
} from './common/stack_traces';
export type { ElasticFlameGraph, BaseFlameGraph } from './common/flamegraph';
export type { FrameGroupID } from './common/frame_group';
export type {
  Executable,
  FileID,
  StackFrame,
  StackFrameID,
  StackFrameMetadata,
  StackTrace,
  StackTraceID,
} from './common/profiling';
export type { ProfilingStatus } from './common/profiling_status';
export type { TopNFunctions } from './common/functions';
export type { AggregationField, ESTopNFunctions } from './common/es_functions';
