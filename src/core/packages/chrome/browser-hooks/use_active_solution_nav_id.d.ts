import type { SolutionId } from '@kbn/core-chrome-browser';
/**
 * Returns the ID of the currently active solution navigation, or `null` when
 * no solution nav is active (e.g. in classic nav mode).
 */
export declare function useActiveSolutionNavId(): SolutionId | null;
