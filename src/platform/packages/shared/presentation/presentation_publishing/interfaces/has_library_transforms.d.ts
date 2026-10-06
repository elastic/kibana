/**
 * APIs that inherit this interface can be linked to and unlinked from the library.
 */
export interface HasLibraryTransforms<ByReferenceSerializedState extends object = object, ByValueSerializedState extends object = object> {
    /**
     * @returns {Promise<boolean>}
     */
    hasLibraryItemWithTitle: (title: string) => Promise<boolean>;
    /**
     *
     * @returns {Promise<boolean>}
     * Returns true when this API is by-value and can be converted to by-reference
     */
    canLinkToLibrary: () => Promise<boolean>;
    /**
     *
     * @returns {Promise<boolean>}
     * Returns true when this API is by-reference and can be converted to by-value
     */
    canUnlinkFromLibrary: () => Promise<boolean>;
    /**
     * Save the state of this API to the library. This will return the ID of the persisted library item.
     *
     * @returns {Promise<string>} id of persisted library item
     */
    saveToLibrary: (title: string) => Promise<string>;
    /**
     *
     * @returns {ByReferenceSerializedState}
     * get by-reference serialized state from this API.
     */
    getSerializedStateByReference: (newId: string) => ByReferenceSerializedState;
    /**
     *
     * @returns {ByValueSerializedState}
     * get by-value serialized state from this API
     */
    getSerializedStateByValue: () => ByValueSerializedState;
}
export declare const apiHasLibraryTransforms: <StateT extends object = object>(unknownApi: null | unknown) => unknownApi is HasLibraryTransforms<StateT>;
