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
    SelfCPU: number;
    AnnualCO2TonsExclusive: number[];
    AnnualCO2TonsInclusive: number[];
    AnnualCostsUSDInclusive: number[];
    AnnualCostsUSDExclusive: number[];
}
/** Elasticsearch flamegraph */
export interface ElasticFlameGraph extends Omit<BaseFlameGraph, 'AnnualCO2TonsExclusive' | 'AnnualCO2TonsInclusive' | 'SelfAnnualCO2Tons' | 'TotalAnnualCO2Tons' | 'AnnualCostsUSDInclusive' | 'AnnualCostsUSDExclusive'> {
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
export declare function createFlameGraph(base: BaseFlameGraph, showErrorFrames: boolean): ElasticFlameGraph;
