/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { override } from '.';

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

export type StackFrame = {
  FileName: string;
  FunctionName: string;
  FunctionOffset: number;
  LineNumber: number;
  SourceType: number;
};

export type StackFrameMetadata = {
  FileID: FileID;
  AddressOrLine: number;

  FunctionName: string;
  SourceID: FileID;
  SourceLine: number;
  FunctionOffset: number;

  CommitHash: string;
  SourceCodeURL: string;
  SourcePackageHash: string;
  FrameTypeString: string;
  SourceFilename: string;
  ExeFileName: string;
  SourcePackageURL: string;
  FrameType: number;
  FunctionLine: number;
  SourceType: number;
};

const defaultStackFrameMetadata: StackFrameMetadata = {
  FileID: '',
  AddressOrLine: 0,

  FunctionName: '',
  SourceID: '',
  SourceLine: 0,
  FunctionOffset: 0,

  CommitHash: '',
  SourceCodeURL: '',
  SourcePackageHash: '',
  FrameTypeString: '',
  SourceFilename: '',
  ExeFileName: '',
  SourcePackageURL: '',
  FrameType: 0,
  FunctionLine: 0,
  SourceType: 0,
};

export function buildStackFrameMetadata(
  metadata: Partial<StackFrameMetadata> = {}
): StackFrameMetadata {
  return override(defaultStackFrameMetadata, metadata);
}

export interface Executable {
  FileName: string;
}

export type FrameGroup = Pick<
  StackFrameMetadata,
  'FileID' | 'ExeFileName' | 'FunctionName' | 'AddressOrLine' | 'SourceFilename'
>;

const defaultFrameGroup: FrameGroup = {
  FileID: '',
  ExeFileName: '',
  FunctionName: '',
  AddressOrLine: 0,
  SourceFilename: '',
};

// This is a convenience function to build a FrameGroup value with
// defaults for missing fields
export function buildFrameGroup(frameGroup: Partial<FrameGroup> = {}): FrameGroup {
  return override(defaultFrameGroup, frameGroup);
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

export type FrameGroupID = string;

// defaultGroupBy is the "standard" way of grouping frames, by commonly
// shared group identifiers.
//
// For ELF-symbolized frames, group by FunctionName and FileID.
// For non-symbolized frames, group by FileID and AddressOrLine.
// Otherwise group by ExeFileName, SourceFilename and FunctionName.
export function defaultGroupBy(frame: StackFrameMetadata): FrameGroupID {
  const frameGroup = buildFrameGroup();

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

  // We serialize to JSON string to use FrameGroup as a key
  return JSON.stringify(frameGroup);
}
