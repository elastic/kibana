import type { ToolingLog } from '@kbn/tooling-log';
export declare const COSMOS_DB_EMULATOR_DEFAULT_IMAGE = "docker.elastic.co/kibana-ci/uiam-azure-cosmos-emulator:latest-verified";
export declare const UIAM_DEFAULT_IMAGE = "docker.elastic.co/kibana-ci/uiam:latest-verified";
export interface UiamContainer {
    name: string;
    image: string;
    params: string[];
    cmdParams: string[];
}
/**
 * Returns the list of UIAM containers to run.
 * When `includeOAuth` is true, includes the UIAM OAuth container.
 */
export declare function getUiamContainers({ includeOAuth, }?: {
    includeOAuth?: boolean;
}): UiamContainer[];
/** @deprecated Use {@link getUiamContainers} instead */
export declare const UIAM_CONTAINERS: UiamContainer[];
/**
 * Run a single UIAM-related container.
 */
export declare function runUiamContainer(log: ToolingLog, container: UiamContainer): Promise<string>;
export declare function initializeUiamContainers(log: ToolingLog): Promise<void>;
