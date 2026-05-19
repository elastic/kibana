import { LegendSize } from '@kbn/chart-expressions-common';
type APILegendSize = 'auto' | 's' | 'm' | 'l' | 'xl';
export declare const legendSizeCompat: {
    toState: {
        (value: APILegendSize): LegendSize;
        (value?: APILegendSize | undefined): LegendSize | undefined;
    };
    toAPI: {
        (value: LegendSize): APILegendSize;
        (value?: LegendSize | undefined): APILegendSize | undefined;
    };
};
export {};
