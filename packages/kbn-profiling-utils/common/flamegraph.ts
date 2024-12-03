/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFrameGroupID } from './frame_group';
import { fnv1a64 } from './hash';
import { createStackFrameMetadata, getCalleeLabel, isErrorFrame } from './profiling';
import { convertTonsToKgs } from './utils';

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
  AnnualCO2TonsExclusive: number[];
  AnnualCO2TonsInclusive: number[];
  AnnualCostsUSDInclusive: number[];
  AnnualCostsUSDExclusive: number[];
}

/** Elasticsearch flamegraph */
export interface ElasticFlameGraph
  extends Omit<
    BaseFlameGraph,
    | 'AnnualCO2TonsExclusive'
    | 'AnnualCO2TonsInclusive'
    | 'SelfAnnualCO2Tons'
    | 'TotalAnnualCO2Tons'
    | 'AnnualCostsUSDInclusive'
    | 'AnnualCostsUSDExclusive'
  > {
  /** ID */
  ID: string[];
  /** Label */
  Label: string[];
  SelfAnnualCO2KgsItems: number[];
  TotalAnnualCO2KgsItems: number[];
  SelfAnnualCostsUSDItems: number[];
  TotalAnnualCostsUSDItems: number[];
}

/**
 *
 * createFlameGraph combines the base flamegraph with CPU-intensive values.
 * This allows us to create a flamegraph in two steps (e.g. first on the server
 * and finally in the browser).
 * @param base BaseFlameGraph
 * @param showErrorFrames
 * @returns ElasticFlameGraph
 */
export function createFlameGraph(
  base: BaseFlameGraph,
  showErrorFrames: boolean
): ElasticFlameGraph {
  if (!showErrorFrames) {
    // This loop jumps over the error frames in the graph.
    // Error frames only appear as child nodes of the root frame.
    // Error frames only have a single child node.
    for (let i = 0; i < base.Edges[0].length; i++) {
      const childNodeID = base.Edges[0][i];
      if (isErrorFrame(base.FrameType[childNodeID])) {
        base.Edges[0][i] = base.Edges[childNodeID][0];
      }
    }
  }

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
    SelfAnnualCO2KgsItems: base.AnnualCO2TonsExclusive.map(convertTonsToKgs),
    TotalAnnualCO2KgsItems: base.AnnualCO2TonsInclusive.map(convertTonsToKgs),
    SelfAnnualCostsUSDItems: base.AnnualCostsUSDExclusive,
    TotalAnnualCostsUSDItems: base.AnnualCostsUSDInclusive,
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
    });
    graph.Label[i] = getCalleeLabel(metadata);
  }

  return graph;
}
