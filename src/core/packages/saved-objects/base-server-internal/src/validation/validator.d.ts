import type { Logger } from '@kbn/logging';
import type { SavedObjectsValidationMap, SavedObjectSanitizedDoc } from '@kbn/core-saved-objects-server';
/**
 * Helper class that takes a {@link SavedObjectsValidationMap} and runs validations for a
 * given type based on the provided Kibana version.
 *
 * @internal
 */
export declare class SavedObjectsTypeValidator {
    private readonly log;
    private readonly type;
    private readonly defaultVersion;
    private readonly validationMap;
    private readonly orderedVersions;
    constructor({ logger, type, validationMap, defaultVersion, }: {
        logger: Logger;
        type: string;
        validationMap: SavedObjectsValidationMap | (() => SavedObjectsValidationMap);
        defaultVersion: string;
    });
    validate(document: SavedObjectSanitizedDoc): void;
}
