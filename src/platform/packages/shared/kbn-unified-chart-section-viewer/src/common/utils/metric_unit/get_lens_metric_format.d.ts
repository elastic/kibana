import type { LensBaseLayer } from '@kbn/lens-embeddable-utils';
import type { MetricUnit } from '../../../types';
export declare const durationUnitNames: {
    ns: string;
    us: string;
    ms: string;
    s: string;
    m: string;
    h: string;
    d: string;
};
export declare function getLensMetricFormat(unit: MetricUnit): Pick<LensBaseLayer, 'format' | 'decimals' | 'fromUnit' | 'toUnit'> | undefined;
