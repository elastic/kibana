import type { KibanaRequest } from '@kbn/core-http-server';
import type { Capabilities } from '@kbn/core-capabilities-common';
import type { SwitcherWithOptions } from './types';
export type CapabilitiesResolver = ({ request, capabilityPath, applications, useDefaultCapabilities, }: {
    request: KibanaRequest;
    capabilityPath: string[];
    applications: string[];
    useDefaultCapabilities: boolean;
}) => Promise<Capabilities>;
export declare const getCapabilitiesResolver: (getCapabilities: () => Capabilities, getSwitchers: () => SwitcherWithOptions[]) => CapabilitiesResolver;
