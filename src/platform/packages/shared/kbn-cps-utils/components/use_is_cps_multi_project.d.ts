import type { ICPSManager } from '../types';
/**
 * `true` once cross-project search is ready and has at least one linked project, `false` once
 * ready with none (or when `cpsManager` isn't provided), and `undefined` while readiness is
 * still pending. Use it to gate UI that only makes sense with more than one project, e.g. scope
 * pickers or cross-project copy; treat it as falsy if you don't need to distinguish "not yet
 * known" from "no linked projects".
 *
 * A manager that already reports linked projects answers `true` on the first render, so callers
 * gating a column or panel on it don't shift layout after paint. Every other answer waits for
 * `cpsManager.whenReady()`, since `hasLinkedProjects()` reports `false` until then even in a
 * multi-project deployment.
 */
export declare const useIsCpsMultiProject: (cpsManager?: ICPSManager) => boolean | undefined;
