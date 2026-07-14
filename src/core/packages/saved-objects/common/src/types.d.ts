/**
 * An identifier for a saved object within a space.
 *
 * @public
 */
export interface SavedObjectTypeIdTuple {
    /** The id of the saved object */
    id: string;
    /** The type of the saved object */
    type: string;
}
/**
 * Client interface for interacting with legacy URL aliases.
 */
export interface LegacyUrlAliasTarget {
    /**
     * The namespace that the object existed in when it was converted.
     */
    targetSpace: string;
    /**
     * The type of the object when it was converted.
     */
    targetType: string;
    /**
     * The original ID of the object, before it was converted.
     */
    sourceId: string;
}
