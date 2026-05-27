import type { ContentClient } from './content_client';
import type { ContentTypeRegistry } from './registry';
export interface SetupDependencies {
}
export interface StartDependencies {
}
export interface ContentManagementPublicSetup {
    registry: Pick<ContentTypeRegistry, 'register'>;
}
export interface ContentManagementPublicStart {
    client: ContentClient;
    registry: Pick<ContentTypeRegistry, 'get' | 'getAll'>;
}
