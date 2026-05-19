import type { CapabilitiesSwitcher } from '@kbn/core-capabilities-server';
export interface SwitcherWithOptions {
    switcher: CapabilitiesSwitcher;
    capabilityPath: string[];
}
export interface SwitcherWithId extends SwitcherWithOptions {
    id: string;
}
export interface SwitcherBucket {
    switchers: SwitcherWithId[];
    bucketPaths: Set<string>;
}
