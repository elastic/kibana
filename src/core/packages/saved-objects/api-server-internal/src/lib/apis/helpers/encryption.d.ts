import type { PublicMethodsOf } from '@kbn/utility-types';
import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { AuthorizationTypeMap, ISavedObjectsSecurityExtension, ISavedObjectsEncryptionExtension } from '@kbn/core-saved-objects-server';
export type IEncryptionHelper = PublicMethodsOf<EncryptionHelper>;
export declare class EncryptionHelper {
    private securityExtension?;
    private encryptionExtension?;
    constructor({ securityExtension, encryptionExtension, }: {
        securityExtension?: ISavedObjectsSecurityExtension;
        encryptionExtension?: ISavedObjectsEncryptionExtension;
    });
    optionallyEncryptAttributes<T>(type: string, id: string, namespaceOrNamespaces: string | string[] | undefined, attributes: T): Promise<T>;
    optionallyDecryptAndRedactSingleResult<T, A extends string>(object: SavedObject<T>, typeMap: AuthorizationTypeMap<A> | undefined, originalAttributes?: T): Promise<SavedObject<T>>;
    optionallyDecryptAndRedactBulkResult<T, R extends {
        saved_objects: Array<SavedObject<T>>;
    }, A extends string, O extends Array<{
        attributes: T;
    }>>(response: R, typeMap: AuthorizationTypeMap<A> | undefined, originalObjects?: O): Promise<R & {
        saved_objects: SavedObject<T>[];
    }>;
}
