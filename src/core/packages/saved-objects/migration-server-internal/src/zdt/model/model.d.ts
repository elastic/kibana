import type { State, AllActionStates } from '../state';
import type { ResponseType } from '../next';
import type { MigratorContext } from '../context';
import type { ModelStage } from './types';
type ModelStageMap = {
    [K in AllActionStates]: ModelStage<K, any>;
};
export declare const modelStageMap: ModelStageMap;
export declare const model: (current: State, response: ResponseType<AllActionStates>, context: MigratorContext) => State;
export {};
