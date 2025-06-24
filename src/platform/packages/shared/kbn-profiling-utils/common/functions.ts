/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { sumBy } from 'lodash';
import type {
  Executable,
  FileID,
  FrameGroupID,
  StackFrame,
  StackFrameID,
  StackFrameMetadata,
  StackTrace,
  StackTraceID,
} from '..';
import {
  createFrameGroupID,
  createStackFrameMetadata,
  emptyExecutable,
  emptyStackFrame,
  emptyStackTrace,
} from '..';
import { isErrorFrame } from './profiling';

interface TopNFunctionAndFrameGroup {
  Frame: StackFrameMetadata;
  FrameGroupID: FrameGroupID;
  CountExclusive: number;
  CountInclusive: number;
  selfAnnualCO2kgs: number;
  selfAnnualCostUSD: number;
  totalAnnualCO2kgs: number;
  totalAnnualCostUSD: number;
}

type TopNFunction = Pick<
  TopNFunctionAndFrameGroup,
  | 'Frame'
  | 'CountExclusive'
  | 'CountInclusive'
  | 'selfAnnualCO2kgs'
  | 'selfAnnualCostUSD'
  | 'totalAnnualCO2kgs'
  | 'totalAnnualCostUSD'
> & {
  Id: string;
  Rank: number;
  subGroups: Record<string, number>;
};

export interface TopNFunctions {
  TotalCount: number;
  TopN: TopNFunction[];
  SamplingRate: number;
  selfCPU: number;
  totalCPU: number;
  totalAnnualCO2Kgs: number;
  totalAnnualCostUSD: number;
}

export function createTopNFunctions({
  endIndex,
  events,
  executables,
  samplingRate,
  stackFrames,
  stackTraces,
  startIndex,
  showErrorFrames,
}: {
  endIndex: number;
  events: Map<StackTraceID, number>;
  executables: Map<FileID, Executable>;
  samplingRate: number;
  stackFrames: Map<StackFrameID, StackFrame>;
  stackTraces: Map<StackTraceID, StackTrace>;
  startIndex: number;
  showErrorFrames: boolean;
}): TopNFunctions {
  // The `count` associated with a frame provides the total number of
  // traces in which that node has appeared at least once. However, a
  // frame may appear multiple times in a trace, and thus to avoid
  // counting it multiple times we need to record the frames seen so
  // far in each trace.
  let totalCount = 0;
  const topNFunctions = new Map<FrameGroupID, TopNFunctionAndFrameGroup>();
  // The factor to apply to sampled events to scale the estimated result correctly.
  const scalingFactor = 1.0 / samplingRate;

  // Collect metadata and inclusive + exclusive counts for each distinct frame.
  for (const [stackTraceID, count] of events) {
    const uniqueFrameGroupsPerEvent = new Set<FrameGroupID>();
    const scaledCount = count * scalingFactor;
    totalCount += scaledCount;

    // It is possible that we do not have a stacktrace for an event,
    // e.g. when stopping the host agent or on network errors.
    const stackTrace = stackTraces.get(stackTraceID) ?? emptyStackTrace;
    const selfAnnualCO2kgs = stackTrace.selfAnnualCO2Kgs;
    const selfAnnualCostUSD = stackTrace.selfAnnualCostUSD;

    const lenStackTrace = stackTrace.FrameIDs.length;

    // Error frames only appear as first frame in a stacktrace.
    const start =
      !showErrorFrames && lenStackTrace > 0 && isErrorFrame(stackTrace.Types[0]) ? 1 : 0;

    for (let i = start; i < lenStackTrace; i++) {
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

      let topNFunction = topNFunctions.get(frameGroupID);

      if (topNFunction === undefined) {
        const metadata = createStackFrameMetadata({
          FrameID: frameID,
          FileID: fileID,
          AddressOrLine: addressOrLine,
          FrameType: stackTrace.Types[i],
          Inline: frame.Inline,
          FunctionName: frame.FunctionName,
          FunctionOffset: frame.FunctionOffset,
          SourceLine: frame.LineNumber,
          SourceFilename: frame.FileName,
          ExeFileName: executable.FileName,
        });

        topNFunction = {
          Frame: metadata,
          FrameGroupID: frameGroupID,
          CountExclusive: 0,
          CountInclusive: 0,
          selfAnnualCO2kgs: 0,
          totalAnnualCO2kgs: 0,
          selfAnnualCostUSD: 0,
          totalAnnualCostUSD: 0,
        };

        topNFunctions.set(frameGroupID, topNFunction);
      }

      if (!uniqueFrameGroupsPerEvent.has(frameGroupID)) {
        uniqueFrameGroupsPerEvent.add(frameGroupID);
        topNFunction.CountInclusive += scaledCount;
        topNFunction.totalAnnualCO2kgs += selfAnnualCO2kgs;
        topNFunction.totalAnnualCostUSD += selfAnnualCostUSD;
      }

      if (i === lenStackTrace - 1) {
        // Leaf frame: sum up counts for exclusive CPU.
        topNFunction.CountExclusive += scaledCount;
        topNFunction.selfAnnualCO2kgs += selfAnnualCO2kgs;
        topNFunction.selfAnnualCostUSD += selfAnnualCostUSD;
      }
    }
  }

  // Sort in descending order by exclusive CPU. Same values should appear in a
  // stable order, so compare the FrameGroup in this case.
  const topN = [...topNFunctions.values()];
  topN
    .sort((a: TopNFunctionAndFrameGroup, b: TopNFunctionAndFrameGroup) => {
      if (a.CountExclusive > b.CountExclusive) {
        return 1;
      }
      if (a.CountExclusive < b.CountExclusive) {
        return -1;
      }
      return a.FrameGroupID.localeCompare(b.FrameGroupID);
    })
    .reverse();

  if (startIndex > topN.length) {
    startIndex = topN.length;
  }
  if (endIndex > topN.length) {
    endIndex = topN.length;
  }

  const framesAndCountsAndIds = topN
    .slice(startIndex, endIndex)
    .map((frameAndCount, i): TopNFunction => {
      const countExclusive = frameAndCount.CountExclusive;
      const countInclusive = frameAndCount.CountInclusive;

      return {
        Rank: i + 1,
        Frame: frameAndCount.Frame,
        CountExclusive: countExclusive,
        CountInclusive: countInclusive,
        Id: frameAndCount.FrameGroupID,
        selfAnnualCO2kgs: frameAndCount.selfAnnualCO2kgs,
        selfAnnualCostUSD: frameAndCount.selfAnnualCostUSD,
        totalAnnualCO2kgs: frameAndCount.totalAnnualCO2kgs,
        totalAnnualCostUSD: frameAndCount.totalAnnualCostUSD,
        subGroups: {},
      };
    });

  const sumSelfCPU = sumBy(framesAndCountsAndIds, 'CountExclusive');
  const sumTotalCPU = sumBy(framesAndCountsAndIds, 'CountInclusive');
  const totalAnnualCO2Kgs = sumBy(framesAndCountsAndIds, 'selfAnnualCO2kgs');
  const totalAnnualCostUSD = sumBy(framesAndCountsAndIds, 'selfAnnualCostUSD');

  return {
    TotalCount: totalCount,
    TopN: framesAndCountsAndIds,
    SamplingRate: samplingRate,
    selfCPU: sumSelfCPU,
    totalCPU: sumTotalCPU,
    totalAnnualCO2Kgs,
    totalAnnualCostUSD,
  };
}

export enum TopNFunctionSortField {
  Rank = 'rank',
  Frame = 'frame',
  Samples = 'samples',
  SelfCPU = 'selfCPU',
  TotalCPU = 'totalCPU',
  Diff = 'diff',
  AnnualizedCo2 = 'annualizedCo2',
  AnnualizedDollarCost = 'annualizedDollarCost',
}

export const topNFunctionSortFieldRt = t.union([
  t.literal(TopNFunctionSortField.Rank),
  t.literal(TopNFunctionSortField.Frame),
  t.literal(TopNFunctionSortField.Samples),
  t.literal(TopNFunctionSortField.SelfCPU),
  t.literal(TopNFunctionSortField.TotalCPU),
  t.literal(TopNFunctionSortField.Diff),
  t.literal(TopNFunctionSortField.AnnualizedCo2),
  t.literal(TopNFunctionSortField.AnnualizedDollarCost),
]);

export enum TopNComparisonFunctionSortField {
  ComparisonRank = 'comparison_rank',
  ComparisonFrame = 'comparison_frame',
  ComparisonSamples = 'comparison_samples',
  ComparisonSelfCPU = 'comparison_selfCPU',
  ComparisonTotalCPU = 'comparison_totalCPU',
  ComparisonDiff = 'comparison_diff',
}

export const topNComparisonFunctionSortFieldRt = t.union([
  t.literal(TopNComparisonFunctionSortField.ComparisonRank),
  t.literal(TopNComparisonFunctionSortField.ComparisonFrame),
  t.literal(TopNComparisonFunctionSortField.ComparisonSamples),
  t.literal(TopNComparisonFunctionSortField.ComparisonSelfCPU),
  t.literal(TopNComparisonFunctionSortField.ComparisonTotalCPU),
  t.literal(TopNComparisonFunctionSortField.ComparisonDiff),
]);
