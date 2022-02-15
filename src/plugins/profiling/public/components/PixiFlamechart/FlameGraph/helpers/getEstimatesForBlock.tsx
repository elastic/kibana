import { DrawableNode } from "./DataContainer";
import { DrawableBlock } from "./flamechartDataContainer";

export enum TypeOfGraph {
  Flamegraph = "flamegraph",
  Callgraph = "callgraph"
}

const ANNUAL_SECONDS = 60 * 60 * 24 * 365;

// The assumed amortized per-core average power consumption.
const PER_CORE_WATT = 40;

// The assumed CO2 emissions per KWH (sourced from www.eia.gov)
const CO2_PER_KWH = 0.92;

// The cost of a CPU core per hour, in dollars
const CORE_COST_PER_HOUR = 0.0425;

export interface PerBlockEstimates {
  samples?: number;
  percentage: number;
  percentageNoChildren?: number;
  coreSeconds: number;
  coreSecondsNoChildren?: number;
  annualizedCoreSeconds: number;
  annualizedCoreSecondsNoChildren?: number;
  co2: number;
  co2NoChildren?: number;
  annualizedCo2: number;
  annualizedCo2NoChildren?: number;
  dollarCost: number;
  dollarCostNoChildren?: number;
  annualizedDollarCost: number;
  annualizedDollarCostNoChildren?: number;
}

const getEstimatesForBlock = (
  block: DrawableNode<number> | DrawableBlock,
  graphDataContainer: any,
  typeOfGraph: any
): PerBlockEstimates => {
  let samples: number;
  let childSamples: number;
  let totalCount: number;
  let totalSeconds: number;

  let percentage: number;
  let percentageNoChildren: number;
  let totalCoreSeconds: number;
  let coreSeconds: number;
  let coreSecondsNoChildren: number;
  let coreHours: number;
  let coreHoursNoChildren: number;
  let annualizedScaleUp: number;
  let co2: number;
  let co2NoChildren: number;
  let annualizedCo2: number;
  let annualizedCo2NoChildren: number;
  let dollarCost: number;
  let dollarCostNoChildren: number;

  if (typeOfGraph === TypeOfGraph.Callgraph) {
    const callgraphBlock = block as DrawableNode<number>;

    totalCount = graphDataContainer.totalCount;
    totalSeconds = graphDataContainer.totalSeconds;

    percentage = callgraphBlock.Count / totalCount;
    totalCoreSeconds = totalCount / 20;
    coreSeconds = totalCoreSeconds * percentage;
    coreHours = coreSeconds / (60 * 60);
    annualizedScaleUp = ANNUAL_SECONDS / totalSeconds;
    co2 = ((PER_CORE_WATT * coreHours) / 1000.0) * CO2_PER_KWH;
    annualizedCo2 = co2 * annualizedScaleUp;
    dollarCost = coreHours * CORE_COST_PER_HOUR;

    return {
      percentage: percentage,
      coreSeconds: coreSeconds,
      annualizedCoreSeconds: coreSeconds * annualizedScaleUp,
      co2: co2,
      annualizedCo2: annualizedCo2,
      dollarCost: dollarCost,
      annualizedDollarCost: dollarCost * annualizedScaleUp
    };
  }

  if (typeOfGraph === TypeOfGraph.Flamegraph) {
    const flamegraphBlock = block as DrawableBlock;

    samples = flamegraphBlock.Samples;
    childSamples = flamegraphBlock.Callees.map(callee => callee.Samples).reduce(
      (acc, score) => acc + score,
      0
    );
    percentage = flamegraphBlock.Samples / graphDataContainer.sampledTraces;
    percentageNoChildren =
      (samples - childSamples) / graphDataContainer.sampledTraces;
    totalCoreSeconds = graphDataContainer.totalTraces / 20;
    coreSeconds = totalCoreSeconds * percentage;
    coreSecondsNoChildren = totalCoreSeconds * percentageNoChildren;
    coreHours = coreSeconds / (60 * 60);
    coreHoursNoChildren = coreSecondsNoChildren / (60 * 60);
    annualizedScaleUp = ANNUAL_SECONDS / graphDataContainer.totalSeconds;
    co2 = ((PER_CORE_WATT * coreHours) / 1000.0) * CO2_PER_KWH;
    co2NoChildren =
      ((PER_CORE_WATT * coreHoursNoChildren) / 1000.0) * CO2_PER_KWH;
    annualizedCo2 = co2 * annualizedScaleUp;
    annualizedCo2NoChildren = co2NoChildren * annualizedScaleUp;
    dollarCost = coreHours * CORE_COST_PER_HOUR;
    dollarCostNoChildren = coreHoursNoChildren * CORE_COST_PER_HOUR;

    return {
      samples: samples,
      percentage: percentage,
      percentageNoChildren: percentageNoChildren,
      coreSeconds: coreSeconds,
      coreSecondsNoChildren: coreSecondsNoChildren,
      annualizedCoreSeconds: coreSeconds * annualizedScaleUp,
      annualizedCoreSecondsNoChildren:
        coreSecondsNoChildren * annualizedScaleUp,
      co2: co2,
      co2NoChildren: co2NoChildren,
      annualizedCo2: annualizedCo2,
      annualizedCo2NoChildren: annualizedCo2NoChildren,
      dollarCost: dollarCost,
      dollarCostNoChildren: dollarCostNoChildren,
      annualizedDollarCost: dollarCost * annualizedScaleUp,
      annualizedDollarCostNoChildren: dollarCostNoChildren * annualizedScaleUp
    };
  }

  return undefined!;
};

export { getEstimatesForBlock };
