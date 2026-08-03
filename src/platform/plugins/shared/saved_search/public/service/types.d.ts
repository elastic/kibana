import type { SavedObjectsResolveResponse } from '@kbn/core-saved-objects-api-server';
import type { SavedSearch as SavedSearchCommon } from '../../common';
/** @public **/
export interface SavedSearch extends SavedSearchCommon {
    sharingSavedObjectProps?: {
        outcome?: SavedObjectsResolveResponse['outcome'];
        aliasTargetId?: SavedObjectsResolveResponse['alias_target_id'];
        aliasPurpose?: SavedObjectsResolveResponse['alias_purpose'];
        errorJSON?: string;
    };
}
