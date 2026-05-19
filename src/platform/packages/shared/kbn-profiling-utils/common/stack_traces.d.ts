import type { Executable, FileID, StackFrame, StackFrameID, StackTrace, StackTraceID } from './profiling';
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
    /** sampling rate */
    samplingRate: number;
}
/**
 * Generate Frame ID
 * @param frameID string
 * @param n number
 * @returns string
 */
export declare const makeFrameID: (frameID: string, n: number) => string;
/**
 * Decodes stack trace response
 * @param response StackTraceResponse
 * @param showErrorFrames
 * @returns DecodedStackTraceResponse
 */
export declare function decodeStackTraceResponse(response: StackTraceResponse, showErrorFrames: boolean): DecodedStackTraceResponse;
/**
 * Stacktraces options
 */
export declare enum StackTracesDisplayOption {
    StackTraces = "stackTraces",
    Percentage = "percentage"
}
/**
 * Functions TopN types definition
 */
export declare enum TopNType {
    Containers = "containers",
    Deployments = "deployments",
    Executables = "executables",
    Threads = "threads",
    Hosts = "hosts",
    Traces = "traces"
}
/**
 * Get Profiling ES field based on TopN Type
 * @param type TopNType
 * @returns string
 */
export declare function getFieldNameForTopNType(type: TopNType): string;
export {};
