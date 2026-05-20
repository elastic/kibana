import type { FC, PropsWithChildren } from 'react';
import type { CustomIntegrationsFindService } from './find';
import type { CustomIntegrationsPlatformService } from './platform';
/**
 * Services used by the custom_integrations plugin.
 */
export interface CustomIntegrationsServices {
    find: CustomIntegrationsFindService;
    platform: CustomIntegrationsPlatformService;
}
/**
 * The `React.Context` Provider component for the `CustomIntegrationsServices` context.  Any
 * plugin or environment that consumes CustomIntegrationsServices components needs to wrap their React
 * tree with this provider.
 *
 * Within a plugin, you can  use the CustomIntegrations plugin and retrieve a fully-configured
 * context from the `start` contract.
 */
export declare const CustomIntegrationsServicesProvider: FC<PropsWithChildren<CustomIntegrationsServices>>;
/**
 * React hook for accessing pre-wired `SharedUxServices`.
 */
export declare function useCustomIntegrationsServices(): CustomIntegrationsServices;
/**
 * A React hook that provides connections to the `CustomIntegrationsFindService`.
 */
export declare const useFindService: () => CustomIntegrationsFindService;
/**
 * A React hook that provides connections to the `CustomIntegrationsPlatformService`.
 */
export declare const usePlatformService: () => CustomIntegrationsPlatformService;
