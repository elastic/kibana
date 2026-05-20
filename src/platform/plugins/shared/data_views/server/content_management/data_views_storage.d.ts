import { SOContentStorage } from '@kbn/content-management-utils';
import type { Logger } from '@kbn/logging';
import type { DataViewCrudTypes } from '../../common/content_management';
export declare class DataViewsStorage extends SOContentStorage<DataViewCrudTypes> {
    constructor({ logger, throwOnResultValidationError, }: {
        logger: Logger;
        throwOnResultValidationError: boolean;
    });
}
