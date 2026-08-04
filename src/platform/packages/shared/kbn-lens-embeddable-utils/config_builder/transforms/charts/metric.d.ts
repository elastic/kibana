import { type TypedLensSerializedState } from '@kbn/lens-common';
import type { LensAttributes } from '../../types';
import type { MetricConfig } from '../../schema';
type MetricStyling = NonNullable<MetricConfig['styling']>;
type MetricIconName = NonNullable<NonNullable<MetricStyling['icon']>['name']>;
export declare const iconCompat: {
    toState: {
        (value: MetricIconName): string;
        (value?: MetricIconName | undefined): string | undefined;
    };
    toAPI: {
        (value: string): MetricIconName;
        (value?: string | undefined): MetricIconName | undefined;
    };
};
type MetricAttributes = Extract<TypedLensSerializedState['attributes'], {
    visualizationType: 'lnsMetric';
}>;
export type MetricAttributesWithoutFiltersAndQuery = Omit<MetricAttributes, 'state'> & {
    state: Omit<MetricAttributes['state'], 'filters' | 'query'>;
};
export declare function fromAPItoLensState(config: MetricConfig): MetricAttributesWithoutFiltersAndQuery;
export declare function fromLensStateToAPI(config: LensAttributes): MetricConfig;
export {};
