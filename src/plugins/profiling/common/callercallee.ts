/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { clone } from 'lodash';

import {
  compareFrameGroup,
  defaultGroupBy,
  FrameGroup,
  FrameGroupID,
  hashFrameGroup,
  StackFrameMetadata,
  StackTraceID,
} from './profiling';

export type CallerCalleeIntermediateNode = {
  frameGroup: FrameGroup;
  callers: Map<FrameGroupID, CallerCalleeIntermediateNode>;
  callees: Map<FrameGroupID, CallerCalleeIntermediateNode>;
  frameMetadata: Set<StackFrameMetadata>;
  samples: number;
};

export function createCallerCalleeIntermediateNode(
  frameMetadata: StackFrameMetadata,
  samples: number
): CallerCalleeIntermediateNode {
  return {
    frameGroup: defaultGroupBy(frameMetadata),
    callers: new Map<FrameGroupID, CallerCalleeIntermediateNode>(),
    callees: new Map<FrameGroupID, CallerCalleeIntermediateNode>(),
    frameMetadata: new Set<StackFrameMetadata>([frameMetadata]),
    samples: samples,
  };
}

type relevantTrace = {
  frames: StackFrameMetadata[];
  index: number;
};

// selectRelevantTraces searches through a map that maps trace hashes to their
// frames and only returns those traces that have a frame that are equivalent
// to the rootFrame provided. It also sets the "index" in the sequence of
// traces at which the rootFrame is found.
//
// If the rootFrame is "empty" (e.g. fileID is empty and line number is 0), all
// traces in the given time frame are deemed relevant, and the "index" is set
// to the length of the trace -- since there is no root frame, the frame should
// be considered "calls-to" only going.
function selectRelevantTraces(
  rootFrame: StackFrameMetadata,
  frames: Map<StackTraceID, StackFrameMetadata[]>
): Map<StackTraceID, relevantTrace> {
  const result = new Map<StackTraceID, relevantTrace>();
  const rootString = hashFrameGroup(defaultGroupBy(rootFrame));
  for (const [stackTraceID, frameMetadata] of frames) {
    if (rootFrame.FileID === '' && rootFrame.AddressOrLine === 0) {
      // If the root frame is empty, every trace is relevant, and all elements
      // of the trace are relevant. This means that the index is set to the
      // length of the frameMetadata, implying that in the absence of a root
      // frame the "topmost" frame is the root frame.
      result.set(stackTraceID, {
        frames: frameMetadata,
        index: frameMetadata.length,
      } as relevantTrace);
    } else {
      // Search for the right index of the root frame in the frameMetadata, and
      // set it in the result.
      for (let i = 0; i < frameMetadata.length; i++) {
        if (rootString === hashFrameGroup(defaultGroupBy(frameMetadata[i]))) {
          result.set(stackTraceID, {
            frames: frameMetadata,
            index: i,
          } as relevantTrace);
        }
      }
    }
  }
  return result;
}

function sortRelevantTraces(relevantTraces: Map<StackTraceID, relevantTrace>): StackTraceID[] {
  const sortedRelevantTraces = new Array<StackTraceID>();
  for (const trace of relevantTraces.keys()) {
    sortedRelevantTraces.push(trace);
  }
  return sortedRelevantTraces.sort((t1, t2) => {
    if (t1 < t2) return -1;
    if (t1 > t2) return 1;
    return 0;
  });
}

// createCallerCalleeIntermediateRoot creates a graph in the internal
// representation from a StackFrameMetadata that identifies the "centered"
// function and the trace results that provide traces and the number of times
// that the trace has been seen.
//
// The resulting data structure contains all of the data, but is not yet in the
// form most easily digestible by others.
export function createCallerCalleeIntermediateRoot(
  rootFrame: StackFrameMetadata,
  traces: Map<StackTraceID, number>,
  frames: Map<StackTraceID, StackFrameMetadata[]>
): CallerCalleeIntermediateNode {
  // Create a node for the centered frame
  const root = createCallerCalleeIntermediateNode(rootFrame, 0);

  // Obtain only the relevant frames (e.g. frames that contain the root frame
  // somewhere). If the root frame is "empty" (e.g. fileID is zero and line
  // number is zero), all frames are deemed relevant.
  const relevantTraces = selectRelevantTraces(rootFrame, frames);

  // For a deterministic result we have to walk the traces in a deterministic
  // order. A deterministic result allows for deterministic UI views, something
  // that users expect.
  const relevantTracesSorted = sortRelevantTraces(relevantTraces);

  // Walk through all traces that contain the root. Increment the count of the
  // root by the count of that trace. Walk "up" the trace (through the callers)
  // and add the count of the trace to each caller. Then walk "down" the trace
  // (through the callees) and add the count of the trace to each callee.
  for (const traceHash of relevantTracesSorted) {
    const trace = relevantTraces.get(traceHash)!;

    // The slice of frames is ordered so that the leaf function is at index 0.
    // This means that the "second part" of the slice are the callers, and the
    // "first part" are the callees.
    //
    // We currently assume there are no callers.
    const callees = trace.frames;
    const samples = traces.get(traceHash)!;

    // Go through the callees, reverse iteration
    let currentNode = clone(root);
    root.samples += samples;
    for (let i = callees.length - 1; i >= 0; i--) {
      const callee = callees[i];
      const calleeName = hashFrameGroup(defaultGroupBy(callee));
      let node = currentNode.callees.get(calleeName);
      if (node === undefined) {
        node = createCallerCalleeIntermediateNode(callee, samples);
        currentNode.callees.set(calleeName, node);
      } else {
        node.samples += samples;
      }
      currentNode = node;
    }
  }
  return root;
}

export type CallerCalleeNode = {
  Callers: CallerCalleeNode[];
  Callees: CallerCalleeNode[];
  FileID: string;
  FrameType: number;
  ExeFileName: string;
  FunctionID: string;
  FunctionName: string;
  AddressOrLine: number;
  FunctionSourceLine: number;
  FunctionSourceID: string;
  FunctionSourceURL: string;
  SourceFilename: string;
  SourceLine: number;
  Samples: number;
};

export function createCallerCalleeNode(options: Partial<CallerCalleeNode> = {}): CallerCalleeNode {
  const node = {} as CallerCalleeNode;

  node.Callers = clone(options.Callers ?? []);
  node.Callees = clone(options.Callees ?? []);
  node.FileID = options.FileID ?? '';
  node.FrameType = options.FrameType ?? 0;
  node.ExeFileName = options.ExeFileName ?? '';
  node.FunctionID = options.FunctionID ?? '';
  node.FunctionName = options.FunctionName ?? '';
  node.AddressOrLine = options.AddressOrLine ?? 0;
  node.FunctionSourceLine = options.FunctionSourceLine ?? 0;
  node.FunctionSourceID = options.FunctionSourceID ?? '';
  node.FunctionSourceURL = options.FunctionSourceURL ?? '';
  node.SourceFilename = options.SourceFilename ?? '';
  node.SourceLine = options.SourceLine ?? 0;
  node.Samples = options.Samples ?? 0;

  return node;
}

// selectCallerCalleeData is the "standard" way of merging multiple frames into
// one node. It simply takes the data from the first frame.
function selectCallerCalleeData(frameMetadata: Set<StackFrameMetadata>, node: CallerCalleeNode) {
  for (const metadata of frameMetadata) {
    node.FileID = metadata.FileID;
    node.FrameType = metadata.FrameType;
    node.ExeFileName = metadata.ExeFileName;
    node.FunctionID = metadata.FunctionName;
    node.FunctionName = metadata.FunctionName;
    node.AddressOrLine = metadata.AddressOrLine;

    // Unknown/invalid offsets are currently set to 0.
    //
    // In this case we leave FunctionSourceLine=0 as a flag for the UI that the
    // FunctionSourceLine should not be displayed.
    //
    // As FunctionOffset=0 could also be a legit value, this work-around needs
    // a real fix. The idea for after GA is to change FunctionOffset=-1 to
    // indicate unknown/invalid.
    if (metadata.FunctionOffset > 0) {
      node.FunctionSourceLine = metadata.SourceLine - metadata.FunctionOffset;
    } else {
      node.FunctionSourceLine = 0;
    }

    node.FunctionSourceID = metadata.SourceID;
    node.FunctionSourceURL = metadata.SourceCodeURL;
    node.SourceFilename = metadata.SourceFilename;
    node.SourceLine = metadata.SourceLine;
    break;
  }
}

function sortNodes(
  nodes: Map<FrameGroupID, CallerCalleeIntermediateNode>
): CallerCalleeIntermediateNode[] {
  const sortedNodes = new Array<CallerCalleeIntermediateNode>();
  for (const node of nodes.values()) {
    sortedNodes.push(node);
  }
  return sortedNodes.sort((n1, n2) => {
    return compareFrameGroup(n1.frameGroup, n2.frameGroup);
  });
}

// fromCallerCalleeIntermediateNode is used to convert the intermediate representation
// of the diagram into the format that is easily JSONified and more easily consumed by
// others.
export function fromCallerCalleeIntermediateNode(
  root: CallerCalleeIntermediateNode
): CallerCalleeNode {
  const node = createCallerCalleeNode({ Samples: root.samples });

  // Populate the other fields with data from the root node. Selectors are not supposed
  // to be able to fail.
  selectCallerCalleeData(root.frameMetadata, node);

  // Now fill the caller and callee arrays.
  // For a deterministic result we have to walk the callers / callees in a deterministic
  // order. A deterministic result allows deterministic UI views, something that users expect.
  for (const caller of sortNodes(root.callers)) {
    node.Callers.push(fromCallerCalleeIntermediateNode(caller));
  }
  for (const callee of sortNodes(root.callees)) {
    node.Callees.push(fromCallerCalleeIntermediateNode(callee));
  }

  return node;
}
