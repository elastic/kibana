import { type DevToolsVariable } from './types';
export declare const editVariable: (newVariable: DevToolsVariable, variables: DevToolsVariable[]) => DevToolsVariable[];
export declare const deleteVariable: (variables: DevToolsVariable[], id: string) => DevToolsVariable[];
export declare const isValidVariableName: (name: string) => boolean;
