import type { History } from '../../../services';
import type { ObjectStorageClient } from '../../../../common/types';
export interface Dependencies {
    history: History;
    objectStorageClient: ObjectStorageClient;
}
/**
 * Once off migration to new text object data structure
 */
export declare function migrateToTextObjects({ history, objectStorageClient: objectStorageClient, }: Dependencies): Promise<void>;
