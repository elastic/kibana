export declare class KbnError extends Error {
    constructor(message: string);
}
/**
 * when a mapping already exists for a field the user is attempting to add
 * @param {String} name - the field name
 */
export declare class DuplicateField extends KbnError {
    constructor(name: string);
}
/**
 * when a user is attempting to create a field with disallowed character in the name, like *
 * @param {String} character - the character not allowed in name
 * @param {String} name - the field name
 */
export declare class CharacterNotAllowedInField extends KbnError {
    constructor(character: string, name: string);
}
/**
 * A saved object was not found
 */
export declare class SavedObjectNotFound extends KbnError {
    savedObjectType: string;
    savedObjectTypeDisplayName: string;
    savedObjectId?: string;
    constructor({ type, typeDisplayName, id, link, customMessage, }: {
        type: string;
        typeDisplayName?: string;
        id?: string;
        link?: string;
        customMessage?: string;
    });
}
/**
 * A saved field doesn't exist anymore
 */
export declare class SavedFieldNotFound extends KbnError {
    constructor(message: string);
}
/**
 * A saved field type isn't compatible with aggregation
 */
export declare class SavedFieldTypeInvalidForAgg extends KbnError {
    constructor(message: string);
}
/**
 * This error is for scenarios where a saved object is detected that has invalid JSON properties.
 * There was a scenario where we were importing objects with double-encoded JSON, and the system
 * was silently failing. This error is now thrown in those scenarios.
 */
export declare class InvalidJSONProperty extends KbnError {
    constructor(message: string);
}
