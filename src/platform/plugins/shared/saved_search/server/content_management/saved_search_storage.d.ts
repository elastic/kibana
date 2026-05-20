import type { PartialSavedObject } from '@kbn/content-management-utils';
import { SOContentStorage } from '@kbn/content-management-utils';
import type { Logger } from '@kbn/logging';
import type { SavedObject } from '@kbn/core/server';
import type { SavedSearchCrudTypes } from '../../common/content_management';
export declare class SavedSearchStorage extends SOContentStorage<SavedSearchCrudTypes> {
    constructor({ logger, throwOnResultValidationError, }: {
        logger: Logger;
        throwOnResultValidationError: boolean;
    });
    savedObjectToItem(savedObject: SavedObject<SavedSearchCrudTypes['Attributes']>): SavedSearchCrudTypes['Item'];
    savedObjectToItem(savedObject: PartialSavedObject<SavedSearchCrudTypes['Attributes']>, partial: true): SavedSearchCrudTypes['PartialItem'];
}
