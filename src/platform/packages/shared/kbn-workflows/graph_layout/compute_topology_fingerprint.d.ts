import type { WorkflowYaml } from '../spec/schema';
/**
 * Returns a stable string capturing the workflow's *structure* (trigger types
 * + recursive step `name:type` walk). Used as a memoization key for the graph
 * transform + dagre layout.
 *
 * Edits that do NOT change the fingerprint (e.g. tweaking a step's
 * `description`, `params`, or branch expression) will not retrigger layout.
 *
 * The fingerprint encodes branch *slot* (`then`, `else`, `branch[n]`,
 * `case[n]`, `default`) so moving a step from one branch to another always
 * produces a distinct key even when step names and depths are unchanged.
 */
export declare function computeTopologyFingerprint(workflow: WorkflowYaml | undefined): string;
