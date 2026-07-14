import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ISavedObjectTypeRegistry, ISavedObjectsSpacesExtension, ISavedObjectsEncryptionExtension } from '@kbn/core-saved-objects-server';
import type { CreatePointInTimeFinderFn } from '../../point_in_time_finder';
export type ICommonHelper = PublicMethodsOf<CommonHelper>;
export declare class CommonHelper {
    private registry;
    private spaceExtension?;
    private encryptionExtension?;
    private defaultIndex;
    private kibanaVersion;
    readonly createPointInTimeFinder: CreatePointInTimeFinderFn;
    constructor({ registry, createPointInTimeFinder, spaceExtension, encryptionExtension, kibanaVersion, defaultIndex, }: {
        registry: ISavedObjectTypeRegistry;
        spaceExtension?: ISavedObjectsSpacesExtension;
        encryptionExtension?: ISavedObjectsEncryptionExtension;
        createPointInTimeFinder: CreatePointInTimeFinderFn;
        defaultIndex: string;
        kibanaVersion: string;
    });
    /**
     * Returns index specified by the given type or the default index
     *
     * @param type - the type
     */
    getIndexForType(type: string): string;
    /**
     * Returns an array of indices as specified in `this._registry` for each of the
     * given `types`. If any of the types don't have an associated index, the
     * default index `this._index` will be included.
     *
     * @param types The types whose indices should be retrieved
     */
    getIndicesForTypes(types: string[]): string[];
    /**
     * {@inheritDoc ISavedObjectsRepository.getCurrentNamespace}
     */
    getCurrentNamespace(namespace?: string): string | undefined;
    /**
     * Saved objects with encrypted attributes should have IDs that are hard to guess, especially since IDs are part of the AAD used during
     * encryption, that's why we control them within this function and don't allow consumers to specify their own IDs directly for encryptable
     * types unless overwriting the original document.
     */
    getValidId(type: string, id: string | undefined, version: string | undefined, overwrite: boolean | undefined): string;
}
