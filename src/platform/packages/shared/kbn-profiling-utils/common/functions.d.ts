import * as t from 'io-ts';
import type { Executable, FileID, FrameGroupID, StackFrame, StackFrameID, StackFrameMetadata, StackTrace, StackTraceID } from '..';
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
type TopNFunction = Pick<TopNFunctionAndFrameGroup, 'Frame' | 'CountExclusive' | 'CountInclusive' | 'selfAnnualCO2kgs' | 'selfAnnualCostUSD' | 'totalAnnualCO2kgs' | 'totalAnnualCostUSD'> & {
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
export declare function createTopNFunctions({ endIndex, events, executables, samplingRate, stackFrames, stackTraces, startIndex, showErrorFrames, }: {
    endIndex: number;
    events: Map<StackTraceID, number>;
    executables: Map<FileID, Executable>;
    samplingRate: number;
    stackFrames: Map<StackFrameID, StackFrame>;
    stackTraces: Map<StackTraceID, StackTrace>;
    startIndex: number;
    showErrorFrames: boolean;
}): TopNFunctions;
export declare enum TopNFunctionSortField {
    Rank = "rank",
    Frame = "frame",
    Samples = "samples",
    SelfCPU = "selfCPU",
    TotalCPU = "totalCPU",
    Diff = "diff",
    AnnualizedCo2 = "annualizedCo2",
    AnnualizedDollarCost = "annualizedDollarCost"
}
export declare const topNFunctionSortFieldRt: t.UnionC<[t.LiteralC<TopNFunctionSortField.Rank>, t.LiteralC<TopNFunctionSortField.Frame>, t.LiteralC<TopNFunctionSortField.Samples>, t.LiteralC<TopNFunctionSortField.SelfCPU>, t.LiteralC<TopNFunctionSortField.TotalCPU>, t.LiteralC<TopNFunctionSortField.Diff>, t.LiteralC<TopNFunctionSortField.AnnualizedCo2>, t.LiteralC<TopNFunctionSortField.AnnualizedDollarCost>]>;
export declare enum TopNComparisonFunctionSortField {
    ComparisonRank = "comparison_rank",
    ComparisonFrame = "comparison_frame",
    ComparisonSamples = "comparison_samples",
    ComparisonSelfCPU = "comparison_selfCPU",
    ComparisonTotalCPU = "comparison_totalCPU",
    ComparisonDiff = "comparison_diff"
}
export declare const topNComparisonFunctionSortFieldRt: t.UnionC<[t.LiteralC<TopNComparisonFunctionSortField.ComparisonRank>, t.LiteralC<TopNComparisonFunctionSortField.ComparisonFrame>, t.LiteralC<TopNComparisonFunctionSortField.ComparisonSamples>, t.LiteralC<TopNComparisonFunctionSortField.ComparisonSelfCPU>, t.LiteralC<TopNComparisonFunctionSortField.ComparisonTotalCPU>, t.LiteralC<TopNComparisonFunctionSortField.ComparisonDiff>]>;
export {};
