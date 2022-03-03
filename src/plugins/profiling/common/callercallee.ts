/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { override } from '.';
import {
  buildFrameGroup,
  compareFrameGroup,
  defaultGroupBy,
  FrameGroup,
  FrameGroupID,
  StackFrameMetadata,
  StackTraceID,
} from './profiling';

export interface CallerCalleeIntermediateNode {
  nodeID: FrameGroup;
  callers: Map<FrameGroupID, CallerCalleeIntermediateNode>;
  callees: Map<FrameGroupID, CallerCalleeIntermediateNode>;
  frameMetadata: Set<StackFrameMetadata>;
  samples: number;
}

export function buildCallerCalleeIntermediateNode(
  frame: StackFrameMetadata,
  samples: number
): CallerCalleeIntermediateNode {
  let node: CallerCalleeIntermediateNode = {
    nodeID: buildFrameGroup(),
    callers: new Map<FrameGroupID, CallerCalleeIntermediateNode>(),
    callees: new Map<FrameGroupID, CallerCalleeIntermediateNode>(),
    frameMetadata: new Set<StackFrameMetadata>(),
    samples: samples,
  };
  node.frameMetadata.add(frame);
  return node;
}

interface relevantTrace {
  frames: StackFrameMetadata[];
  index: number;
}

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
  const rootString = defaultGroupBy(rootFrame);
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
        if (rootString === defaultGroupBy(frameMetadata[i])) {
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
  const sortedRelevantTraces: StackTraceID[] = new Array(relevantTraces.size);
  for (const trace of relevantTraces.keys()) {
    sortedRelevantTraces.push(trace);
  }
  return sortedRelevantTraces.sort((t1, t2) => {
    if (t1 < t2) return -1;
    if (t1 > t2) return 1;
    return 0;
  });
}

export function buildCallerCalleeIntermediateRoot(
  rootFrame: StackFrameMetadata,
  traces: Map<StackTraceID, number>,
  frames: Map<StackTraceID, StackFrameMetadata[]>
): CallerCalleeIntermediateNode {
  const root = buildCallerCalleeIntermediateNode(rootFrame, 0);
  const relevantTraces = selectRelevantTraces(rootFrame, frames);
  const relevantTracesSorted = sortRelevantTraces(relevantTraces);
  for (const traceHash of relevantTracesSorted) {
    const trace = relevantTraces.get(traceHash)!;
    const callees = trace.frames;
    const samples = traces.get(traceHash)!;

    // Go through the callees, reverse iteration
    let currentNode = root;
    for (let i = callees.length - 1; i >= 0; i--) {
      const callee = callees[i];
      const calleeName = defaultGroupBy(callee);
      let node = currentNode.callees.get(calleeName);
      if (node === undefined) {
        node = buildCallerCalleeIntermediateNode(callee, samples);
        currentNode.callees.set(calleeName, node);
      } else {
        node.samples = samples;
      }
      currentNode = node;
    }
  }
  return root;
}

export interface CallerCalleeNode {
  Callers: CallerCalleeNode[];
  Callees: CallerCalleeNode[];

  FileID: string;
  FrameType: number;
  ExeFileName: string;
  FunctionID: string;
  FunctionName: string;
  AddressOrLine: number;
  FunctionSourceLine: number;

  // symbolization fields - currently unused
  FunctionSourceID: string;
  FunctionSourceURL: string;
  SourceFilename: string;
  SourceLine: number;

  Samples: number;
}

const defaultCallerCalleeNode: CallerCalleeNode = {
  Callers: [],
  Callees: [],
  FileID: '',
  FrameType: 0,
  ExeFileName: '',
  FunctionID: '',
  FunctionName: '',
  AddressOrLine: 0,
  FunctionSourceLine: 0,
  FunctionSourceID: '',
  FunctionSourceURL: '',
  SourceFilename: '',
  SourceLine: 0,
  Samples: 0,
};

export function buildCallerCalleeNode(node: Partial<CallerCalleeNode> = {}): CallerCalleeNode {
  return override(defaultCallerCalleeNode, node);
}

// selectCallerCalleeData is the "standard" way of merging multiple frames into
// one node. It simply takes the data from the first frame.
function selectCallerCalleeData(frameMetadata: Set<StackFrameMetadata>, node: CallerCalleeNode) {
  for (const metadata of frameMetadata) {
    node.ExeFileName = metadata.ExeFileName;
    node.FunctionID = metadata.FunctionName;
    node.FunctionName = metadata.FunctionName;
    node.FunctionSourceID = metadata.SourceID;
    node.FunctionSourceURL = metadata.SourceCodeURL;
    node.FunctionSourceLine = metadata.FunctionLine;
    node.SourceLine = metadata.SourceLine;
    node.FrameType = metadata.FrameType;
    node.SourceFilename = metadata.SourceFilename;
    node.FileID = metadata.FileID;
    node.AddressOrLine = metadata.AddressOrLine;
    break;
  }
}

function sortNodes(
  nodes: Map<FrameGroupID, CallerCalleeIntermediateNode>
): CallerCalleeIntermediateNode[] {
  const sortedNodes: CallerCalleeIntermediateNode[] = new Array(nodes.size);
  for (const node of nodes.values()) {
    sortedNodes.push(node);
  }
  return sortedNodes.sort((n1, n2) => {
    return compareFrameGroup(n1.nodeID, n2.nodeID);
  });
}

// fromCallerCalleeIntermediateNode is used to convert the intermediate representation
// of the diagram into the format that is easily JSONified and more easily consumed by
// others.
export function fromCallerCalleeIntermediateNode(
  root: CallerCalleeIntermediateNode
): CallerCalleeNode {
  const node = buildCallerCalleeNode({ Samples: root.samples });

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
