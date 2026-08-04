import type { FileMetadata, FileJSON } from '../../common/types';
export declare function serializeJSON<M = unknown>(attrs: Partial<FileJSON>): Partial<FileMetadata<M>>;
export declare function toJSON<M = unknown>(id: string, attrs: FileMetadata<M>): FileJSON<M>;
