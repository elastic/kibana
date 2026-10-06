import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { type IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { RepositoryEsClient } from '../../repository_es_client';
/** @internal */
export interface DeleteLegacyUrlAliasesParams {
    mappings: IndexMapping;
    registry: ISavedObjectTypeRegistry;
    client: RepositoryEsClient;
    getIndexForType: (type: string) => string;
    /** The object type. */
    type: string;
    /** The object ID. */
    id: string;
    /**
     * The namespaces to include or exclude when searching for legacy URL alias targets (depends on the `deleteBehavior` parameter).
     * Note that using `namespaces: [], deleteBehavior: 'exclusive'` will delete all aliases for this object in all spaces.
     */
    namespaces: string[];
    /**
     * If this is equal to 'inclusive', all aliases with a `targetNamespace` in the `namespaces` array will be deleted.
     * If this is equal to 'exclusive', all aliases with a `targetNamespace` _not_ in the `namespaces` array will be deleted.
     */
    deleteBehavior: 'inclusive' | 'exclusive';
}
/**
 * Deletes legacy URL aliases that point to a given object.
 *
 * Note that aliases are only created when an object is converted to become share-capable, and each targetId is deterministically generated
 * with uuidv5 -- this means that the chances of there actually being _multiple_ legacy URL aliases that target a given type/ID are slim to
 * none. However, we don't always know exactly what space an alias could be in (if an object exists in multiple spaces, or in all spaces),
 * so the most straightforward way for us to ensure that aliases are reliably deleted is to use updateByQuery, which is what this function
 * does.
 *
 * @internal
 */
export declare function deleteLegacyUrlAliases(params: DeleteLegacyUrlAliasesParams): Promise<void>;
export declare function createKueryNode(type: string, id: string): import("@kbn/es-query/src/kuery/node_types").KqlFunctionNode;
