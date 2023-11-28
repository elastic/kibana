/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CalleeTree } from './callee';
import { createFrameGroupID } from './frame_group';
import { fnv1a64 } from './hash';
import { createStackFrameMetadata, getCalleeLabel } from './profiling';

/**
 * Base Flamegraph
 */
export interface BaseFlameGraph {
  /** size */
  Size: number;
  /** edges */
  Edges: number[][];
  /** file ids */
  FileID: string[];
  /** frame types */
  FrameType: number[];
  /** inlines */
  Inline: boolean[];
  /** executable file names */
  ExeFilename: string[];
  /** address or line */
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
  /** total seconds */
  TotalSeconds: number;
  /** sampling rate */
  SamplingRate: number;
  TotalSamples: number;
  TotalCPU: number;
  SelfCPU: number;
}

/**
 * createBaseFlameGraph encapsulates the tree representation into a serialized form.
 * @param tree CalleeTree
 * @param samplingRate number
 * @param totalSeconds number
 * @returns BaseFlameGraph
 */
export function createBaseFlameGraph(
  tree: CalleeTree,
  samplingRate: number,
  totalSeconds: number
): BaseFlameGraph {
  const graph: BaseFlameGraph = {
    Size: tree.Size,
    SamplingRate: samplingRate,
    Edges: new Array<number[]>(tree.Size),

    FileID: tree.FileID.slice(0, tree.Size),
    FrameType: tree.FrameType.slice(0, tree.Size),
    Inline: tree.Inline.slice(0, tree.Size),
    ExeFilename: tree.ExeFilename.slice(0, tree.Size),
    AddressOrLine: tree.AddressOrLine.slice(0, tree.Size),
    FunctionName: tree.FunctionName.slice(0, tree.Size),
    FunctionOffset: tree.FunctionOffset.slice(0, tree.Size),
    SourceFilename: tree.SourceFilename.slice(0, tree.Size),
    SourceLine: tree.SourceLine.slice(0, tree.Size),

    CountInclusive: tree.CountInclusive.slice(0, tree.Size),
    CountExclusive: tree.CountExclusive.slice(0, tree.Size),

    TotalSeconds: totalSeconds,
    TotalSamples: tree.TotalSamples,
    SelfCPU: tree.SelfCPU,
    TotalCPU: tree.TotalCPU,
  };

  for (let i = 0; i < tree.Size; i++) {
    let j = 0;
    const nodes = new Array<number>(tree.Edges[i].size);
    for (const [, n] of tree.Edges[i]) {
      nodes[j] = n;
      j++;
    }
    graph.Edges[i] = nodes;
  }

  return graph;
}

/** Elasticsearch flamegraph */
export interface ElasticFlameGraph extends BaseFlameGraph {
  /** ID */
  ID: string[];
  /** Label */
  Label: string[];
}

/**
 *
 * createFlameGraph combines the base flamegraph with CPU-intensive values.
 * This allows us to create a flamegraph in two steps (e.g. first on the server
 * and finally in the browser).
 * @param base BaseFlameGraph
 * @returns ElasticFlameGraph
 */
export function createFlameGraph(base: BaseFlameGraph): ElasticFlameGraph {
  const graph: ElasticFlameGraph = {
    Size: base.Size,
    SamplingRate: base.SamplingRate,
    Edges: base.Edges,

    FileID: base.FileID,
    FrameType: base.FrameType,
    Inline: base.Inline,
    ExeFilename: base.ExeFilename,
    AddressOrLine: base.AddressOrLine,
    FunctionName: base.FunctionName,
    FunctionOffset: base.FunctionOffset,
    SourceFilename: base.SourceFilename,
    SourceLine: base.SourceLine,

    CountInclusive: base.CountInclusive,
    CountExclusive: base.CountExclusive,

    ID: new Array<string>(base.Size),
    Label: new Array<string>(base.Size),

    TotalSeconds: base.TotalSeconds,
    TotalSamples: base.TotalSamples,
    SelfCPU: base.SelfCPU,
    TotalCPU: base.TotalCPU,
  };

  const rootFrameGroupID = createFrameGroupID(
    graph.FileID[0],
    graph.AddressOrLine[0],
    graph.ExeFilename[0],
    graph.SourceFilename[0],
    graph.FunctionName[0]
  );

  graph.ID[0] = fnv1a64(new TextEncoder().encode(rootFrameGroupID));

  const queue = [0];
  while (queue.length > 0) {
    const parent = queue.pop()!;
    for (const child of graph.Edges[parent]) {
      const frameGroupID = createFrameGroupID(
        graph.FileID[child],
        graph.AddressOrLine[child],
        graph.ExeFilename[child],
        graph.SourceFilename[child],
        graph.FunctionName[child]
      );
      const bytes = new TextEncoder().encode(graph.ID[parent] + frameGroupID);
      graph.ID[child] = fnv1a64(bytes);
      queue.push(child);
    }
  }

  graph.Label[0] = 'root: Represents 100% of CPU time.';

  for (let i = 1; i < graph.Size; i++) {
    const metadata = createStackFrameMetadata({
      FileID: graph.FileID[i],
      FrameType: graph.FrameType[i],
      Inline: graph.Inline[i],
      ExeFileName: graph.ExeFilename[i],
      AddressOrLine: graph.AddressOrLine[i],
      FunctionName: graph.FunctionName[i],
      FunctionOffset: graph.FunctionOffset[i],
      SourceFilename: graph.SourceFilename[i],
      SourceLine: graph.SourceLine[i],
      SamplingRate: graph.SamplingRate,
    });
    graph.Label[i] = getCalleeLabel(metadata);
  }

  return graph;
}
