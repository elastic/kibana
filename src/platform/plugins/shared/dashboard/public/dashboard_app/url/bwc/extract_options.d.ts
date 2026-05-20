import type { Writable } from '@kbn/utility-types';
import type { DashboardOptions } from '../../../../server';
export declare function extractOptions(state: {
    [key: string]: unknown;
}): Partial<Writable<DashboardOptions>>;
