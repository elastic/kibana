import type { ActionDefinition, Action } from './action';
export declare function createAction<Context extends object = object>(action: ActionDefinition<Context>): Action<Context>;
