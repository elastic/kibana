/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
 */
export enum FrameType {
  Unsymbolized = 0,
  Python,
  PHP,
  Native,
  Kernel,
  JVM,
  Ruby,
  Perl,
  JavaScript,
  PHPJIT,
  ErrorFlag = 0x80,
  Error = 0xff,
}

const frameTypeDescriptions = {
  [FrameType.Unsymbolized]: '<unsymbolized frame>',
  [FrameType.Python]: 'Python',
  [FrameType.PHP]: 'PHP',
  [FrameType.Native]: 'Native',
  [FrameType.Kernel]: 'Kernel',
  [FrameType.JVM]: 'JVM/Hotspot',
  [FrameType.Ruby]: 'Ruby',
  [FrameType.Perl]: 'Perl',
  [FrameType.JavaScript]: 'JavaScript',
  [FrameType.PHPJIT]: 'PHP JIT',
  [FrameType.ErrorFlag]: 'ErrorFlag',
  [FrameType.Error]: 'Error',
};

export function isErrorFrame(ft: FrameType): boolean {
  // eslint-disable-next-line no-bitwise
  return (ft & FrameType.ErrorFlag) !== 0;
}

/**
 * normalize the given frame type
 * @param ft FrameType
 * @returns FrameType
 */
export function normalizeFrameType(ft: FrameType): FrameType {
  // Normalize any frame type with error bit into our uniform error variant.
  if (isErrorFrame(ft)) {
    return FrameType.Error;
  }

  // Guard against new / unknown frame types, rewriting them to "unsymbolized".
  if (!(ft in frameTypeDescriptions)) {
    return FrameType.Unsymbolized;
  }

  return ft;
}

/**
 * get frame type name
 * @param ft FrameType
 * @returns string
 */
export function describeFrameType(ft: FrameType): string {
  return frameTypeDescriptions[normalizeFrameType(ft)];
}

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
export const emptyStackTrace: StackTrace = {
  /** Frame IDs */
  FrameIDs: [],
  /** File IDs */
  FileIDs: [],
  /** Address or lines */
  AddressOrLines: [],
  /** Types */
  Types: [],
  selfAnnualCO2Kgs: 0,
  selfAnnualCostUSD: 0,
  Count: 0,
};

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
export const emptyStackFrame: StackFrame = {
  /** File name */
  FileName: '',
  /** Function name */
  FunctionName: '',
  /** Function offset */
  FunctionOffset: 0,
  /** Line number */
  LineNumber: 0,
  /** Inline */
  Inline: false,
};

/** Executable */
export interface Executable {
  /** file name */
  FileName: string;
}

/**
 * Empty exectutable
 */
export const emptyExecutable: Executable = {
  /** file name */
  FileName: '',
};

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
export function createStackFrameMetadata(
  options: Partial<StackFrameMetadata> = {}
): StackFrameMetadata {
  const metadata = {} as StackFrameMetadata;

  metadata.FrameID = options.FrameID ?? '';
  metadata.FileID = options.FileID ?? '';
  metadata.FrameType = options.FrameType ?? 0;
  metadata.Inline = options.Inline ?? false;
  metadata.AddressOrLine = options.AddressOrLine ?? 0;
  metadata.FunctionName = options.FunctionName ?? '';
  metadata.FunctionOffset = options.FunctionOffset ?? 0;
  metadata.SourceFilename = options.SourceFilename ?? '';
  metadata.SourceLine = options.SourceLine ?? 0;
  metadata.ExeFileName = options.ExeFileName ?? '';

  return metadata;
}

function checkIfStringHasParentheses(s: string) {
  return /\(|\)/.test(s);
}

function getFunctionName(metadata: StackFrameMetadata) {
  return checkIfStringHasParentheses(metadata.FunctionName)
    ? metadata.FunctionName
    : `${metadata.FunctionName}()`;
}

function getExeFileName(metadata: StackFrameMetadata) {
  if (metadata?.ExeFileName === undefined) {
    return '';
  }
  if (metadata.ExeFileName !== '') {
    return metadata.ExeFileName;
  }
  return describeFrameType(metadata.FrameType);
}

/**
 * Get callee label
 * @param metadata StackFrameMetadata
 * @returns string
 */
export function getCalleeLabel(metadata: StackFrameMetadata) {
  if (metadata.FrameType === FrameType.Error) {
    return `Error: unwinding error code #${metadata.AddressOrLine.toString()}`;
  }

  const inlineLabel = metadata.Inline ? '-> ' : '';

  if (metadata.FunctionName === '') {
    return `${inlineLabel}${getExeFileName(metadata)}`;
  }

  const sourceFilename = metadata.SourceFilename;
  const sourceURL = sourceFilename ? sourceFilename.split('/').pop() : '';

  if (!sourceURL) {
    return `${inlineLabel}${getExeFileName(metadata)}: ${getFunctionName(metadata)}`;
  }

  if (metadata.SourceLine === 0) {
    return `${inlineLabel}${getExeFileName(metadata)}: ${getFunctionName(
      metadata
    )} in ${sourceURL}`;
  }

  return `${inlineLabel}${getExeFileName(metadata)}: ${getFunctionName(metadata)} in ${sourceURL}#${
    metadata.SourceLine
  }`;
}
/**
 * Get callee function name
 * @param frame StackFrameMetadata
 * @returns string
 */
export function getCalleeFunction(frame: StackFrameMetadata): string {
  // In the best case scenario, we have the file names, source lines,
  // and function names. However we need to deal with missing function or
  // executable info.
  const exeDisplayName = frame.ExeFileName ? frame.ExeFileName : describeFrameType(frame.FrameType);

  // When there is no function name, only use the executable name
  return frame.FunctionName ? exeDisplayName + ': ' + frame.FunctionName : exeDisplayName;
}
/**
 * Frame symbol status
 */
export enum FrameSymbolStatus {
  PARTIALLY_SYMBOLYZED = 'PARTIALLY_SYMBOLYZED',
  NOT_SYMBOLIZED = 'NOT_SYMBOLIZED',
  SYMBOLIZED = 'SYMBOLIZED',
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
export function getFrameSymbolStatus(param: FrameSymbolStatusParams) {
  const { sourceFilename, sourceLine, exeFileName } = param;
  if (sourceFilename === '' && sourceLine === 0) {
    if (exeFileName) {
      return FrameSymbolStatus.PARTIALLY_SYMBOLYZED;
    }

    return FrameSymbolStatus.NOT_SYMBOLIZED;
  }

  return FrameSymbolStatus.SYMBOLIZED;
}

const nativeLanguages = [FrameType.Native, FrameType.Kernel];

interface LanguageTypeParams {
  /** frame type */
  frameType: FrameType;
}

/**
 * Get language type
 * @param param LanguageTypeParams
 * @returns string
 */
export function getLanguageType(param: LanguageTypeParams) {
  return nativeLanguages.includes(param.frameType) ? 'NATIVE' : 'INTERPRETED';
}

/**
 * Get callee source information.
 * If we don't have the executable filename, display <unsymbolized>
 * If no source line or filename available, display the executable offset
 * @param frame StackFrameMetadata
 * @returns string
 */
export function getCalleeSource(frame: StackFrameMetadata): string {
  if (frame.FrameType === FrameType.Error) {
    return `unwinding error code #${frame.AddressOrLine.toString()}`;
  }

  const frameSymbolStatus = getFrameSymbolStatus({
    sourceFilename: frame.SourceFilename,
    sourceLine: frame.SourceLine,
    exeFileName: frame.ExeFileName,
  });

  switch (frameSymbolStatus) {
    case FrameSymbolStatus.NOT_SYMBOLIZED: {
      // If we don't have the executable filename, display <unsymbolized>
      return '<unsymbolized>';
    }
    case FrameSymbolStatus.PARTIALLY_SYMBOLYZED: {
      // If no source line or filename available, display the executable offset
      return frame.ExeFileName + '+0x' + frame.AddressOrLine.toString(16);
    }
    case FrameSymbolStatus.SYMBOLIZED: {
      return frame.SourceFilename + (frame.SourceLine !== 0 ? `#${frame.SourceLine}` : '');
    }
  }
}

/**
 * Group stackframe by stack trace
 * @param stackTraces Map<StackTraceID, StackTrace>
 * @param stackFrames Map<StackFrameID, StackFrame>
 * @param executables Map<FileID, Executable>
 * @returns Record<string, StackFrameMetadata[]>
 */
export function groupStackFrameMetadataByStackTrace(
  stackTraces: Map<StackTraceID, StackTrace>,
  stackFrames: Map<StackFrameID, StackFrame>,
  executables: Map<FileID, Executable>
): Record<string, StackFrameMetadata[]> {
  const stackTraceMap: Record<string, StackFrameMetadata[]> = {};
  for (const [stackTraceID, trace] of stackTraces) {
    const numFramesPerTrace = trace.FrameIDs.length;
    const frameMetadata = new Array<StackFrameMetadata>(numFramesPerTrace);
    for (let i = 0; i < numFramesPerTrace; i++) {
      const frameID = trace.FrameIDs[i];
      const fileID = trace.FileIDs[i];
      const addressOrLine = trace.AddressOrLines[i];
      const frame = stackFrames.get(frameID) ?? emptyStackFrame;
      const executable = executables.get(fileID) ?? emptyExecutable;

      frameMetadata[i] = createStackFrameMetadata({
        FrameID: frameID,
        FileID: fileID,
        AddressOrLine: addressOrLine,
        FrameType: trace.Types[i],
        Inline: frame.Inline,
        FunctionName: frame.FunctionName,
        FunctionOffset: frame.FunctionOffset,
        SourceLine: frame.LineNumber,
        SourceFilename: frame.FileName,
        ExeFileName: executable.FileName,
      });
    }
    stackTraceMap[stackTraceID] = frameMetadata;
  }
  return stackTraceMap;
}
