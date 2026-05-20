import type { Datatable } from '@kbn/expressions-plugin/common';
import type { WithLayerId, ExtendedDataLayerConfig, XYExtendedLayerConfigResult, ExtendedDataLayerArgs, DataLayerArgs } from '../types';
export declare const generateLayerId: (keyword: string, index: number) => string;
export declare function appendLayerIds<T>(layers: Array<T | undefined>, keyword: string): Array<T & WithLayerId>;
export declare const getShowLines: (args: DataLayerArgs | ExtendedDataLayerArgs) => boolean;
export declare function getDataLayers(layers: XYExtendedLayerConfigResult[]): ExtendedDataLayerConfig[];
export declare function getAccessors<T, U extends {
    splitAccessors?: T[];
    xAccessor?: T;
    accessors: T[];
    markSizeAccessor?: T;
}>(args: U, table: Datatable): {
    splitAccessors: (string | T)[] | undefined;
    xAccessor: string | T | undefined;
    accessors: (string | T)[];
    markSizeAccessor: string | T | undefined;
};
