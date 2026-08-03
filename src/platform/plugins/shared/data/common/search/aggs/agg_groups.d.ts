import type { $Values } from '@kbn/utility-types';
export declare const AggGroupNames: Readonly<{
    Buckets: "buckets";
    Metrics: "metrics";
    None: "none";
}>;
export type AggGroupName = $Values<typeof AggGroupNames>;
export declare const AggGroupLabels: {
    buckets: string;
    metrics: string;
    none: string;
};
