import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Logger } from '@kbn/logging';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { type SavedObjectSanitizedDoc } from '@kbn/core-saved-objects-server';
export type IValidationHelper = PublicMethodsOf<ValidationHelper>;
export declare class ValidationHelper {
    private registry;
    private logger;
    private kibanaVersion;
    private typeValidatorMap;
    constructor({ registry, logger, kibanaVersion, }: {
        registry: ISavedObjectTypeRegistry;
        logger: Logger;
        kibanaVersion: string;
    });
    /** The `initialNamespaces` field (create, bulkCreate) is used to create an object in an initial set of spaces. */
    validateInitialNamespaces(type: string, initialNamespaces: string[] | undefined): void;
    /** The object-specific `namespaces` field (bulkGet) is used to check if an object exists in any of a given number of spaces. */
    validateObjectNamespaces(type: string, id: string, namespaces: string[] | undefined): void;
    /** Validate a migrated doc against the registered saved object type's schema. */
    validateObjectForCreate(type: string, doc: SavedObjectSanitizedDoc): void;
    private getTypeValidator;
    /** This is used when objects are created. */
    validateOriginId(type: string, objectOrOptions: {
        originId?: string;
    }): void;
}
