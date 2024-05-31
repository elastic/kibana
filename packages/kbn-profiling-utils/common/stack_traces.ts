/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ProfilingESField } from './elasticsearch';
import {
  Executable,
  FileID,
  isErrorFrame,
  StackFrame,
  StackFrameID,
  StackTrace,
  StackTraceID,
} from './profiling';
import { convertTonsToKgs } from './utils';

/** Profiling status response */
export interface ProfilingStatusResponse {
  /** profiling enabled */
  profiling: {
    enabled: boolean;
  };
  /** resource management status*/
  resource_management: {
    enabled: boolean;
  };
  /** Indices creates / pre 8.9.1 data still available */
  resources: {
    created: boolean;
    pre_8_9_1_data: boolean;
  };
}

interface ProfilingEvents {
  [key: string]: number;
}

export interface ProfilingStackTrace {
  ['file_ids']: string[];
  ['frame_ids']: string[];
  ['address_or_lines']: number[];
  ['type_ids']: number[];
  ['annual_co2_tons']: number;
  ['annual_costs_usd']: number;
  count: number;
}

interface ProfilingStackTraces {
  [key: string]: ProfilingStackTrace;
}

export interface ProfilingStackFrame {
  ['file_name']: string[];
  ['function_name']: string[];
  ['function_offset']: number[];
  ['line_number']: number[];
}

interface ProfilingStackFrames {
  [key: string]: ProfilingStackFrame;
}

interface ProfilingExecutables {
  [key: string]: string;
}

/** Profiling stacktrace */
export interface StackTraceResponse {
  /** stack trace events */
  ['stack_trace_events']?: ProfilingEvents;
  /** stack traces */
  ['stack_traces']?: ProfilingStackTraces;
  /** stack frames */
  ['stack_frames']?: ProfilingStackFrames;
  /** executables */
  ['executables']?: ProfilingExecutables;
  /** total frames */
  ['total_frames']: number;
  /** sampling rate */
  ['sampling_rate']: number;
}

/** Decoded stack trace response */
export interface DecodedStackTraceResponse {
  /** Map of Stacktrace ID and event */
  events: Map<StackTraceID, number>;
  /** Map of stacktrace ID and stacktrace */
  stackTraces: Map<StackTraceID, StackTrace>;
  /** Map of stackframe ID and stackframe */
  stackFrames: Map<StackFrameID, StackFrame>;
  /** Map of file ID and Executables */
  executables: Map<FileID, Executable>;
  /** Total number of frames */
  totalFrames: number;
  /** sampling rate */
  samplingRate: number;
}
/**
 * Generate Frame ID
 * @param frameID string
 * @param n number
 * @returns string
 */
export const makeFrameID = (frameID: string, n: number): string => {
  return n === 0 ? frameID : frameID + ';' + n.toString();
};

// createInlineTrace builds a new StackTrace with inline frames.
const createInlineTrace = (
  trace: ProfilingStackTrace,
  frames: Map<StackFrameID, StackFrame>,
  showErrorFrames: boolean
): StackTrace => {
  // The arrays need to be extended with the inline frame information.
  const frameIDs: string[] = [];
  const fileIDs: string[] = [];
  const addressOrLines: number[] = [];
  const typeIDs: number[] = [];

  // Error frames only appear as first frame in a stacktrace.
  const start =
    !showErrorFrames && trace.frame_ids.length > 0 && isErrorFrame(trace.type_ids[0]) ? 1 : 0;

  for (let i = start; i < trace.frame_ids.length; i++) {
    const frameID = trace.frame_ids[i];
    frameIDs.push(frameID);
    fileIDs.push(trace.file_ids[i]);
    addressOrLines.push(trace.address_or_lines[i]);
    typeIDs.push(trace.type_ids[i]);

    for (let j = 1; ; j++) {
      const inlineID = makeFrameID(frameID, j);
      const frame = frames.get(inlineID);
      if (!frame) {
        break;
      }
      frameIDs.push(inlineID);
      fileIDs.push(trace.file_ids[i]);
      addressOrLines.push(trace.address_or_lines[i]);
      typeIDs.push(trace.type_ids[i]);
    }
  }

  return {
    FrameIDs: frameIDs,
    FileIDs: fileIDs,
    AddressOrLines: addressOrLines,
    Types: typeIDs,
    selfAnnualCO2Kgs: convertTonsToKgs(trace.annual_co2_tons),
    selfAnnualCostUSD: trace.annual_costs_usd,
    Count: trace.count,
  };
};

/**
 * Decodes stack trace response
 * @param response StackTraceResponse
 * @param showErrorFrames
 * @returns DecodedStackTraceResponse
 */
export function decodeStackTraceResponse(
  response: StackTraceResponse,
  showErrorFrames: boolean
): DecodedStackTraceResponse {
  const stackTraceEvents: Map<StackTraceID, number> = new Map();
  for (const [key, value] of Object.entries(response.stack_trace_events ?? {})) {
    stackTraceEvents.set(key, value);
  }

  const stackFrames: Map<StackFrameID, StackFrame> = new Map();
  for (const [frameID, frame] of Object.entries(response.stack_frames ?? {})) {
    // Each field in a stackframe is represented by an array. This is
    // necessary to support inline frames.
    //
    // We store the inlined frames with a modified (and unique) ID.
    // We can do so since we don't display the frame IDs.
    for (let i = 0; i < frame.function_name.length; i++) {
      stackFrames.set(makeFrameID(frameID, i), {
        FileName: frame.file_name[i],
        FunctionName: frame.function_name[i],
        FunctionOffset: frame.function_offset[i],
        LineNumber: frame.line_number[i],
        Inline: i > 0,
      } as StackFrame);
    }
  }

  const stackTraces: Map<StackTraceID, StackTrace> = new Map();
  for (const [traceID, trace] of Object.entries(response.stack_traces ?? {})) {
    stackTraces.set(traceID, createInlineTrace(trace, stackFrames, showErrorFrames));
  }

  const executables: Map<FileID, Executable> = new Map();
  for (const [key, value] of Object.entries(response.executables ?? {})) {
    executables.set(key, {
      FileName: value,
    } as Executable);
  }

  return {
    events: stackTraceEvents,
    stackTraces,
    stackFrames,
    executables,
    totalFrames: response.total_frames,
    samplingRate: response.sampling_rate,
  };
}

/**
 * Stacktraces options
 */
export enum StackTracesDisplayOption {
  StackTraces = 'stackTraces',
  Percentage = 'percentage',
}

/**
 * Functions TopN types definition
 */
export enum TopNType {
  Containers = 'containers',
  Deployments = 'deployments',
  Threads = 'threads',
  Hosts = 'hosts',
  Traces = 'traces',
}

/**
 * Get Profiling ES field based on TopN Type
 * @param type TopNType
 * @returns string
 */
export function getFieldNameForTopNType(type: TopNType): string {
  return {
    [TopNType.Containers]: ProfilingESField.ContainerName,
    [TopNType.Deployments]: ProfilingESField.OrchestratorResourceName,
    [TopNType.Threads]: ProfilingESField.ProcessThreadName,
    [TopNType.Hosts]: ProfilingESField.HostID,
    [TopNType.Traces]: ProfilingESField.StacktraceID,
  }[type];
}
