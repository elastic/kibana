import type { SavedObjectsType } from '@kbn/core/server';
import type { FileMetadata, BaseFileMetadata } from '../../common';
export type SupportedFileHashAlgorithm = keyof Pick<Required<Required<BaseFileMetadata>['hash']>, 'md5' | 'sha1' | 'sha256' | 'sha512'>;
export type FileHashObj = Partial<Record<SupportedFileHashAlgorithm, string>>;
export declare const fileObjectType: SavedObjectsType<FileMetadata>;
