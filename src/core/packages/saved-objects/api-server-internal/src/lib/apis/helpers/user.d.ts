import type { ISavedObjectsSecurityExtension } from '@kbn/core-saved-objects-server';
export declare class UserHelper {
    private securityExtension?;
    constructor({ securityExtension }: {
        securityExtension?: ISavedObjectsSecurityExtension;
    });
    getCurrentUserProfileUid(): string | undefined;
}
