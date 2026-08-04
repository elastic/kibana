import type { ActionVariable } from '@kbn/alerting-types';
export declare const REQUIRED_ACTION_VARIABLES: readonly ["params"];
export declare const CONTEXT_ACTION_VARIABLES: readonly ["context"];
export declare const OPTIONAL_ACTION_VARIABLES: readonly ["context", "state"];
type AsActionVariables<Keys extends string> = {
    [Req in Keys]: ActionVariable[];
};
export type ActionVariables = AsActionVariables<(typeof REQUIRED_ACTION_VARIABLES)[number]> & Partial<AsActionVariables<(typeof OPTIONAL_ACTION_VARIABLES)[number]>>;
export {};
