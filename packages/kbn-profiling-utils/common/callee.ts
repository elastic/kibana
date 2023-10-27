/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createFrameGroupID, FrameGroupID } from './frame_group';
import {
  emptyExecutable,
  emptyStackFrame,
  emptyStackTrace,
  Executable,
  FileID,
  StackFrame,
  StackFrameID,
  StackTrace,
  StackTraceID,
} from './profiling';

type NodeID = number;

/**
 * Callee tree
 */
export interface CalleeTree {
  /** size */
  Size: number;
  /** edges */
  Edges: Array<Map<FrameGroupID, NodeID>>;
  /** file ids */
  FileID: string[];
  /** frame types */
  FrameType: number[];
  /** inlines */
  Inline: boolean[];
  /** executable file names */
  ExeFilename: string[];
  /** address or lines */
  AddressOrLine: number[];
  /** function names */
  FunctionName: string[];
  /** function offsets */
  FunctionOffset: number[];
  /** source file names */
  SourceFilename: string[];
  /** source lines */
  SourceLine: number[];
  /** total cpu */
  CountInclusive: number[];
  /** self cpu */
  CountExclusive: number[];
}

/**
 * Create a callee tree
 * @param events Map<StackTraceID, number>
 * @param stackTraces Map<StackTraceID, StackTrace>
 * @param stackFrames Map<StackFrameID, StackFrame>
 * @param executables Map<FileID, Executable>
 * @param totalFrames number
 * @param samplingRate number
 * @returns
 */
export function createCalleeTree(
  events: Map<StackTraceID, number>,
  stackTraces: Map<StackTraceID, StackTrace>,
  stackFrames: Map<StackFrameID, StackFrame>,
  executables: Map<FileID, Executable>,
  totalFrames: number,
  samplingRate: number
): CalleeTree {
  const tree: CalleeTree = {
    Size: 1,
    Edges: new Array(totalFrames),
    FileID: new Array(totalFrames),
    FrameType: new Array(totalFrames),
    Inline: new Array(totalFrames),
    ExeFilename: new Array(totalFrames),
    AddressOrLine: new Array(totalFrames),
    FunctionName: new Array(totalFrames),
    FunctionOffset: new Array(totalFrames),
    SourceFilename: new Array(totalFrames),
    SourceLine: new Array(totalFrames),

    CountInclusive: new Array(totalFrames),
    CountExclusive: new Array(totalFrames),
  };

  // The inverse of the sampling rate is the number with which to multiply the number of
  // samples to get an estimate of the actual number of samples the backend received.
  const scalingFactor = 1.0 / samplingRate;
  tree.Edges[0] = new Map<FrameGroupID, NodeID>();

  tree.FileID[0] = '';
  tree.FrameType[0] = 0;
  tree.Inline[0] = false;
  tree.ExeFilename[0] = '';
  tree.AddressOrLine[0] = 0;
  tree.FunctionName[0] = '';
  tree.FunctionOffset[0] = 0;
  tree.SourceFilename[0] = '';
  tree.SourceLine[0] = 0;

  tree.CountInclusive[0] = 0;
  tree.CountExclusive[0] = 0;

  const sortedStackTraceIDs = new Array<StackTraceID>();
  for (const trace of stackTraces.keys()) {
    sortedStackTraceIDs.push(trace);
  }
  sortedStackTraceIDs.sort((t1, t2) => {
    return t1.localeCompare(t2);
  });

  // Walk through all traces. Increment the count of the root by the count of
  // that trace. Walk "down" the trace (through the callees) and add the count
  // of the trace to each callee.

  for (const stackTraceID of sortedStackTraceIDs) {
    // The slice of frames is ordered so that the leaf function is at the
    // highest index.

    // It is possible that we do not have a stacktrace for an event,
    // e.g. when stopping the host agent or on network errors.
    const stackTrace = stackTraces.get(stackTraceID) ?? emptyStackTrace;
    const lenStackTrace = stackTrace.FrameIDs.length;
    const samples = Math.floor((events.get(stackTraceID) ?? 0) * scalingFactor);

    let currentNode = 0;

    // Increment the count by the number of samples observed, multiplied with the inverse of the
    // samplingrate (this essentially means scaling up the total samples). It would incur
    tree.CountInclusive[currentNode] += samples;
    tree.CountExclusive[currentNode] = 0;

    for (let i = 0; i < lenStackTrace; i++) {
      const frameID = stackTrace.FrameIDs[i];
      const fileID = stackTrace.FileIDs[i];
      const addressOrLine = stackTrace.AddressOrLines[i];
      const frame = stackFrames.get(frameID) ?? emptyStackFrame;
      const executable = executables.get(fileID) ?? emptyExecutable;

      const frameGroupID = createFrameGroupID(
        fileID,
        addressOrLine,
        executable.FileName,
        frame.FileName,
        frame.FunctionName
      );

      let node = tree.Edges[currentNode].get(frameGroupID);

      if (node === undefined) {
        node = tree.Size;

        tree.FileID[node] = fileID;
        tree.FrameType[node] = stackTrace.Types[i];
        tree.ExeFilename[node] = executable.FileName;
        tree.AddressOrLine[node] = addressOrLine;
        tree.FunctionName[node] = frame.FunctionName;
        tree.FunctionOffset[node] = frame.FunctionOffset;
        tree.SourceLine[node] = frame.LineNumber;
        tree.SourceFilename[node] = frame.FileName;
        tree.Inline[node] = frame.Inline;
        tree.CountInclusive[node] = samples;
        tree.CountExclusive[node] = 0;

        tree.Edges[currentNode].set(frameGroupID, node);
        tree.Edges[node] = new Map<FrameGroupID, NodeID>();

        tree.Size++;
      } else {
        tree.CountInclusive[node] += samples;
      }

      if (i === lenStackTrace - 1) {
        // Leaf frame: sum up counts for exclusive CPU.
        tree.CountExclusive[node] += samples;
      }
      currentNode = node;
    }
  }

  return tree;
}
