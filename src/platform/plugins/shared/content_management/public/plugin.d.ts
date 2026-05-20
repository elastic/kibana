import type { CoreStart, Plugin } from '@kbn/core/public';
import type { ContentManagementPublicStart, ContentManagementPublicSetup, SetupDependencies, StartDependencies } from './types';
import { ContentClient } from './content_client';
export declare class ContentManagementPlugin implements Plugin<ContentManagementPublicSetup, ContentManagementPublicStart, SetupDependencies, StartDependencies> {
    private contentTypeRegistry;
    constructor();
    setup(): {
        registry: {
            register: (definition: import("./registry").ContentTypeDefinition) => import("./registry").ContentType;
        };
    };
    start(core: CoreStart, deps: StartDependencies): {
        client: ContentClient;
        registry: {
            get: (id: string) => import("./registry").ContentType | undefined;
            getAll: () => import("./registry").ContentType[];
        };
    };
}
