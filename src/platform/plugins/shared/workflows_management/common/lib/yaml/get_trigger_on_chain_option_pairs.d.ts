import type { Pair, Scalar, YAMLMap } from 'yaml';
/**
 * Pairs under `triggers[].on` for `workflowEvents` when set to a known enum string (`ignore`, `allow-all`, `avoid-loop`).
 */
export declare function getTriggerOnChainOptionPairs(node: YAMLMap): Array<Pair<Scalar, Scalar>>;
