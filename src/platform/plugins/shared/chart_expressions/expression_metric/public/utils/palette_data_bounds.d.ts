import type { Datatable } from '@kbn/expressions-plugin/common';
export declare const getDataBoundsForPalette: (accessors: {
    metric: string;
    max?: string;
    breakdownBy?: string;
}, data?: Datatable, rowNumber?: number) => {
    min: number;
    max: any;
};
