/**
 * Server-safe re-exports of @elastic/charts constants.
 *
 * @elastic/charts is a browser-only library bundled via webpack for the client.
 * Importing it at runtime on the server forces Node.js to evaluate its entire
 * CJS barrel — including transitive ESM-only dependencies (e.g. uuid@14) —
 * which can crash Kibana at boot. These constants mirror the original values
 * and are validated against the library types at compile time via `satisfies`.
 */
export declare const ChartPosition: {
    readonly Top: "top";
    readonly Bottom: "bottom";
    readonly Left: "left";
    readonly Right: "right";
};
export declare const ChartHorizontalAlignment: {
    readonly Center: "center";
    readonly Right: "right";
    readonly Left: "left";
    readonly Near: "near";
    readonly Far: "far";
};
export declare const ChartVerticalAlignment: {
    readonly Middle: "middle";
    readonly Top: "top";
    readonly Bottom: "bottom";
    readonly Near: "near";
    readonly Far: "far";
};
export declare const ChartLayoutDirection: {
    readonly Horizontal: "horizontal";
    readonly Vertical: "vertical";
};
export declare const ChartLegendValue: {
    readonly CurrentAndLastValue: "currentAndLastValue";
    readonly LastValue: "lastValue";
    readonly LastNonNullValue: "lastNonNullValue";
    readonly Average: "average";
    readonly Median: "median";
    readonly Max: "max";
    readonly Min: "min";
    readonly FirstValue: "firstValue";
    readonly FirstNonNullValue: "firstNonNullValue";
    readonly Total: "total";
    readonly Count: "count";
    readonly DistinctCount: "distinctCount";
    readonly Variance: "variance";
    readonly StdDeviation: "stdDeviation";
    readonly Range: "range";
    readonly Difference: "difference";
    readonly DifferencePercent: "differencePercent";
    readonly Value: "value";
    readonly Percent: "percent";
};
