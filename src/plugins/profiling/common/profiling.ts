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

export type StackTraceEvent = {
  StackTraceID: StackTraceID;
  Count: number;
};

export type StackTrace = {
  FileID: string[];
  FrameID: string[];
  Type: number[];
};

export type StackFrame = {
  FileName: string;
  FunctionName: string;
  FunctionOffset: number;
  LineNumber: number;
  SourceType: number;
};

export type Executable = {
  FileName: string;
};

export type StackFrameMetadata = {
  // StackTrace.FileID
  FileID: FileID;
  // StackTrace.Type
  FrameType: number;
  // stringified FrameType -- FrameType.String()
  FrameTypeString: string;

  // StackFrame.LineNumber?
  AddressOrLine: number;
  // StackFrame.FunctionName
  FunctionName: string;
  // StackFrame.FunctionOffset
  FunctionOffset: number;
  // should this be StackFrame.SourceID?
  SourceID: FileID;
  // StackFrame.LineNumber
  SourceLine: number;

  // Executable.FileName
  ExeFileName: string;

  // unused atm due to lack of symbolization metadata
  CommitHash: string;
  // unused atm due to lack of symbolization metadata
  SourceCodeURL: string;
  // unused atm due to lack of symbolization metadata
  SourceFilename: string;
  // unused atm due to lack of symbolization metadata
  SourcePackageHash: string;
  // unused atm due to lack of symbolization metadata
  SourcePackageURL: string;
  // unused atm due to lack of symbolization metadata
  SourceType: number;

  Index: number;
};

export function createStackFrameMetadata(
  options: Partial<StackFrameMetadata> = {}
): StackFrameMetadata {
  const metadata = {} as StackFrameMetadata;

  metadata.FileID = options.FileID ?? '';
  metadata.FrameType = options.FrameType ?? 0;
  metadata.FrameTypeString = options.FrameTypeString ?? '';
  metadata.AddressOrLine = options.AddressOrLine ?? 0;
  metadata.FunctionName = options.FunctionName ?? '';
  metadata.FunctionOffset = options.FunctionOffset ?? 0;
  metadata.SourceID = options.SourceID ?? '';
  metadata.SourceLine = options.SourceLine ?? 0;
  metadata.ExeFileName = options.ExeFileName ?? '';
  metadata.CommitHash = options.CommitHash ?? '';
  metadata.SourceCodeURL = options.SourceCodeURL ?? '';
  metadata.SourceFilename = options.SourceFilename ?? '';
  metadata.SourcePackageHash = options.SourcePackageHash ?? '';
  metadata.SourcePackageURL = options.SourcePackageURL ?? '';
  metadata.SourceType = options.SourceType ?? 0;
  metadata.Index = options.Index ?? 0;

  return metadata;
}

// groupStackFrameMetadataByStackTrace collects all of the per-stack-frame
// metadata for a given set of trace IDs and their respective stack frames.
//
// This is similar to GetTraceMetaData in pf-storage-backend/storagebackend/storagebackendv1/reads_webservice.go
export function groupStackFrameMetadataByStackTrace(
  stackTraces: Map<StackTraceID, StackTrace>,
  stackFrames: Map<StackFrameID, StackFrame>,
  executables: Map<FileID, Executable>
): Map<StackTraceID, StackFrameMetadata[]> {
  const frameMetadataForTraces = new Map<StackTraceID, StackFrameMetadata[]>();
  for (const [stackTraceID, trace] of stackTraces) {
    const frameMetadata = new Array<StackFrameMetadata>();
    for (let i = 0; i < trace.FrameID.length; i++) {
      const frame = stackFrames.get(trace.FrameID[i])!;
      const executable = executables.get(trace.FileID[i])!;

      const metadata = createStackFrameMetadata({
        FileID: Buffer.from(trace.FileID[i], 'base64url').toString('hex'),
        FrameType: trace.Type[i],
        AddressOrLine: frame.LineNumber,
        FunctionName: frame.FunctionName,
        FunctionOffset: frame.FunctionOffset,
        SourceLine: frame.LineNumber,
        ExeFileName: executable.FileName,
        Index: i,
      });

      frameMetadata.push(metadata);
    }
    frameMetadataForTraces.set(stackTraceID, frameMetadata);
  }
  return frameMetadataForTraces;
}

export type FrameGroup = Pick<
  StackFrameMetadata,
  'FileID' | 'ExeFileName' | 'FunctionName' | 'AddressOrLine' | 'SourceFilename'
>;

// This is a convenience function to create a FrameGroup value with
// defaults for missing fields
export function createFrameGroup(options: Partial<FrameGroup> = {}): FrameGroup {
  const frameGroup = {} as FrameGroup;

  frameGroup.FileID = options.FileID ?? '';
  frameGroup.ExeFileName = options.ExeFileName ?? '';
  frameGroup.FunctionName = options.FunctionName ?? '';
  frameGroup.AddressOrLine = options.AddressOrLine ?? 0;
  frameGroup.SourceFilename = options.SourceFilename ?? '';

  return frameGroup;
}

export function compareFrameGroup(a: FrameGroup, b: FrameGroup): number {
  if (a.ExeFileName < b.ExeFileName) return -1;
  if (a.ExeFileName > b.ExeFileName) return 1;
  if (a.SourceFilename < b.SourceFilename) return -1;
  if (a.SourceFilename > b.SourceFilename) return 1;
  if (a.FunctionName < b.FunctionName) return -1;
  if (a.FunctionName > b.FunctionName) return 1;
  if (a.FileID < b.FileID) return -1;
  if (a.FileID > b.FileID) return 1;
  if (a.AddressOrLine < b.AddressOrLine) return -1;
  if (a.AddressOrLine > b.AddressOrLine) return 1;
  return 0;
}

// defaultGroupBy is the "standard" way of grouping frames, by commonly
// shared group identifiers.
//
// For ELF-symbolized frames, group by FunctionName and FileID.
// For non-symbolized frames, group by FileID and AddressOrLine.
// Otherwise group by ExeFileName, SourceFilename and FunctionName.
export function defaultGroupBy(frame: StackFrameMetadata): FrameGroup {
  const frameGroup = createFrameGroup();

  if (frame.FunctionName === '') {
    // Non-symbolized frame where we only have FileID and AddressOrLine
    frameGroup.FileID = frame.FileID;
    frameGroup.AddressOrLine = frame.AddressOrLine;
  } else if (frame.SourceFilename === '') {
    // Non-symbolized frame with FunctionName set from ELF data
    frameGroup.FunctionName = frame.FunctionName;
    frameGroup.FileID = frame.FileID;
  } else {
    // This is a symbolized frame
    frameGroup.ExeFileName = frame.ExeFileName;
    frameGroup.SourceFilename = frame.SourceFilename;
    frameGroup.FunctionName = frame.FunctionName;
  }

  return frameGroup;
}

export type FrameGroupID = string;

export function hashFrameGroup(frameGroup: FrameGroup): FrameGroupID {
  // We use serialized JSON as the unique value of a frame group for now
  return JSON.stringify(frameGroup);
}
