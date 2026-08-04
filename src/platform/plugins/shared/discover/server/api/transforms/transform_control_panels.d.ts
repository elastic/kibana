import type { DiscoverSessionControlPanels } from '../schema';
export declare const transformControlPanelsOut: (controlGroupJson: string | undefined) => DiscoverSessionControlPanels | undefined;
export declare const transformControlPanelsIn: (controlPanels: DiscoverSessionControlPanels | undefined) => string | undefined;
