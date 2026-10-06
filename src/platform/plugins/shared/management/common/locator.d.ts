import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
export interface ManagementAppLocatorParams extends SerializableRecord {
    sectionId: string;
    appId?: string;
}
export type ManagementAppLocator = LocatorPublic<ManagementAppLocatorParams>;
export declare class ManagementAppLocatorDefinition implements LocatorDefinition<ManagementAppLocatorParams> {
    readonly id = "MANAGEMENT_APP_LOCATOR";
    readonly getLocation: (params: ManagementAppLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
