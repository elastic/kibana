/**
 * Stacktrace ID
 */
export type StackTraceID = string;
/**
 * StackFrame ID
 */
export type StackFrameID = string;
/**
 * File ID
 */
export type FileID = string;
/**
 * Frame type
 * These frame types need to match with the constants defined in
 * https://github.com/open-telemetry/opentelemetry-ebpf-profiler/blob/main/libpf/frametype.go
 */
export declare enum FrameType {
    Unsymbolized = 0,
    Python = 1,
    PHP = 2,
    Native = 3,
    Kernel = 4,
    JVM = 5,
    Ruby = 6,
    Perl = 7,
    JavaScript = 8,
    PHPJIT = 9,
    DotNET = 10,
    Go = 11,
    ErrorFlag = 128,
    Error = 255,
    Root = 256,
    ProcessName = 257,
    ThreadName = 258,
    ExecutableName = 259
}
export declare function isErrorFrame(ft: FrameType): boolean;
/**
 * normalize the given frame type
 * @param ft FrameType
 * @returns FrameType
 */
export declare function normalizeFrameType(ft: FrameType): FrameType;
/**
 * get frame type name
 * @param ft FrameType
 * @returns string
 */
export declare function describeFrameType(ft: FrameType): string;
export interface StackTraceEvent {
    /** stacktrace ID */
    StackTraceID: StackTraceID;
    /** count */
    Count: number;
}
/** Stack trace */
export interface StackTrace {
    /** frame ids */
    FrameIDs: string[];
    /** file ids */
    FileIDs: string[];
    /** address or lines */
    AddressOrLines: number[];
    /** types */
    Types: number[];
    selfAnnualCO2Kgs: number;
    selfAnnualCostUSD: number;
    Count: number;
}
/**
 * Empty stack trace
 */
export declare const emptyStackTrace: StackTrace;
/** Stack frame */
export interface StackFrame {
    /** file name */
    FileName: string;
    /** function name */
    FunctionName: string;
    /** function offset */
    FunctionOffset: number;
    /** line number */
    LineNumber: number;
    /** inline */
    Inline: boolean;
}
/**
 * Empty stack frame
 */
export declare const emptyStackFrame: StackFrame;
/** Executable */
export interface Executable {
    /** file name */
    FileName: string;
}
/**
 * Empty exectutable
 */
export declare const emptyExecutable: Executable;
/** Stack frame metadata */
export interface StackFrameMetadata {
    /** StackTrace.FrameID */
    FrameID: string;
    /** StackTrace.FileID */
    FileID: FileID;
    /** StackTrace.Type */
    FrameType: FrameType;
    /** StackFrame.Inline */
    Inline: boolean;
    /** StackTrace.AddressOrLine */
    AddressOrLine: number;
    /** StackFrame.FunctionName */
    FunctionName: string;
    /** StackFrame.FunctionOffset */
    FunctionOffset: number;
    /** StackFrame.Filename */
    SourceFilename: string;
    /** StackFrame.LineNumber */
    SourceLine: number;
    /** Executable.FileName */
    ExeFileName: string;
}
/**
 * create stackframe metadata
 * @param options Partial<StackFrameMetadata>
 * @returns StackFrameMetadata
 */
export declare function createStackFrameMetadata(options?: Partial<StackFrameMetadata>): StackFrameMetadata;
/**
 * Get callee label
 * @param metadata StackFrameMetadata
 * @returns string
 */
export declare function getCalleeLabel(metadata: StackFrameMetadata): string;
/**
 * Get callee function name
 * @param frame StackFrameMetadata
 * @returns string
 */
export declare function getCalleeFunction(frame: StackFrameMetadata): string;
/**
 * Frame symbol status
 */
export declare enum FrameSymbolStatus {
    PARTIALLY_SYMBOLIZED = "PARTIALLY_SYMBOLIZED",
    NOT_SYMBOLIZED = "NOT_SYMBOLIZED",
    SYMBOLIZED = "SYMBOLIZED"
}
/** Frame symbols status params */
interface FrameSymbolStatusParams {
    /** source file name */
    sourceFilename: string;
    /** source file line */
    sourceLine: number;
    /** executable file name */
    exeFileName?: string;
}
/**
 * Get frame symbol status
 * @param param FrameSymbolStatusParams
 * @returns FrameSymbolStatus
 */
export declare function getFrameSymbolStatus(param: FrameSymbolStatusParams): FrameSymbolStatus;
interface LanguageTypeParams {
    /** frame type */
    frameType: FrameType;
}
/**
 * Get language type
 * @param param LanguageTypeParams
 * @returns string
 */
export declare function getLanguageType(param: LanguageTypeParams): "NATIVE" | "INTERPRETED";
/**
 * Get callee source information.
 * If we don't have the executable filename, display <unsymbolized>
 * If no source line or filename available, display the executable offset
 * @param frame StackFrameMetadata
 * @returns string
 */
export declare function getCalleeSource(frame: StackFrameMetadata): string;
/**
 * Group stackframe by stack trace
 * @param stackTraces Map<StackTraceID, StackTrace>
 * @param stackFrames Map<StackFrameID, StackFrame>
 * @param executables Map<FileID, Executable>
 * @returns Record<string, StackFrameMetadata[]>
 */
export declare function groupStackFrameMetadataByStackTrace(stackTraces: Map<StackTraceID, StackTrace>, stackFrames: Map<StackFrameID, StackFrame>, executables: Map<FileID, Executable>): Record<string, StackFrameMetadata[]>;
export {};
