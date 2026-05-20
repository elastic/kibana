import type { FileHashObj } from '../saved_objects/file';
import type { FileJSON, UpdatableFileMetadata } from '../../common';
export type Action = {
    action: 'delete';
    payload?: undefined;
} | {
    action: 'uploading';
    payload?: undefined;
} | {
    action: 'uploaded';
    payload: {
        size: number;
        hash?: FileHashObj;
    };
} | {
    action: 'uploadError';
    payload?: undefined;
} | {
    action: 'updateFile';
    payload: Partial<UpdatableFileMetadata>;
};
export declare function fileAttributesReducer(state: FileJSON, { action, payload }: Action): FileJSON;
