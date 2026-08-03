import { SOContentStorage } from '@kbn/content-management-utils';
import type { Logger } from '@kbn/logging';
import type { SavedSearchCrudTypes } from '../../common/content_management';
export declare class SavedSearchStorage extends SOContentStorage<SavedSearchCrudTypes> {
    constructor({ logger, throwOnResultValidationError, }: {
        logger: Logger;
        throwOnResultValidationError: boolean;
    });
}
