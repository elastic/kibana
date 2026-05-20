import type { IKibanaResponse } from '@kbn/core/server';
import type { File, FileKind } from '../../../common';
import type { FileServiceStart } from '../../file_service';
type ResultOrHttpError = {
    result: File;
    error?: undefined;
} | {
    result?: undefined;
    error: IKibanaResponse;
};
/**
 * A helper that given an ID will return a file or map errors to an http response.
 */
export declare function getById(fileService: FileServiceStart, id: string, _fileKind: string): Promise<ResultOrHttpError>;
/**
 * Validate file kind restrictions on a provided MIME type
 * @param mimeType The MIME type to validate
 * @param fileKind The file kind definition that may contain restrictions
 * @returns `undefined` if the MIME type is valid or there are no restrictions.
 */
export declare function validateMimeType(mimeType: string | undefined, fileKind: FileKind | undefined): undefined | IKibanaResponse;
/**
 * Validate file name extension matches the file's MIME type
 * @param fileName The file name to validate
 * @param file
 * @returns `undefined` if the extension matches the MIME type or if no MIME type is provided.
 */
export declare function validateFileNameExtension(fileName: string | undefined, file: File | undefined): undefined | IKibanaResponse;
export {};
