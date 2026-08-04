import type { Step } from './types';
/**
 * Enumerates every child-step list inside a parent step (`steps`, `else`,
 * `branches[].steps`). Centralises the branching logic so visitors don't
 * each duplicate it.
 */
export declare const visitStepChildren: (step: Step, callback: (children: Step[]) => void) => void;
/**
 * Recursively walks a step tree depth-first, calling `visitor` for every step
 * including nested children inside `steps`, `else`, and `branches[].steps`.
 */
export declare const walkStepTree: (steps: ReadonlyArray<Step>, visitor: (step: Step, depth: number) => void, depth?: number) => void;
