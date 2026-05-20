import type { FC, PropsWithChildren } from 'react';
export interface DeploymentDetailsContextValue {
    cloudId?: string;
    elasticsearchUrl?: string;
    managementUrl?: string;
    apiKeysLearnMoreUrl: string;
    cloudIdLearnMoreUrl: string;
    navigateToUrl(url: string): Promise<void>;
}
/**
 * Abstract external service Provider.
 */
export declare const DeploymentDetailsProvider: FC<PropsWithChildren<DeploymentDetailsContextValue>>;
/**
 * Kibana-specific service types.
 */
export interface DeploymentDetailsKibanaDependencies {
    /** CoreStart contract */
    core: {
        application: {
            navigateToUrl(url: string): Promise<void>;
        };
    };
    /** SharePluginStart contract */
    share: {
        url: {
            locators: {
                get(id: string): undefined | {
                    useUrl: (params: {
                        sectionId: string;
                        appId: string;
                    }) => string;
                };
            };
        };
    };
    /** CloudSetup contract */
    cloud: {
        isCloudEnabled: boolean;
        cloudId?: string;
        fetchElasticsearchConfig: () => Promise<{
            elasticsearchUrl?: string;
        }>;
    };
    /** DocLinksStart contract */
    docLinks: {
        links: {
            fleet: {
                apiKeysLearnMore: string;
            };
            cloud: {
                beatsAndLogstashConfiguration: string;
            };
        };
    };
}
/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export declare const DeploymentDetailsKibanaProvider: FC<PropsWithChildren<DeploymentDetailsKibanaDependencies>>;
/**
 * React hook for accessing pre-wired services.
 */
export declare function useDeploymentDetails(): DeploymentDetailsContextValue;
