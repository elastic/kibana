import type { ArgumentType } from '@kbn/expressions-plugin/common';
import type { DataLayerArgs, ExtendedDataLayerArgs } from '../types';
type CommonDataLayerArgs = ExtendedDataLayerArgs | DataLayerArgs;
type CommonDataLayerFnArgs = {
    [key in keyof CommonDataLayerArgs]: ArgumentType<CommonDataLayerArgs[key]>;
};
export declare const commonDataLayerArgs: Omit<CommonDataLayerFnArgs, 'accessors' | 'xAccessor' | 'splitAccessors'>;
export {};
