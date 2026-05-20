import type { Readable } from 'stream';
import type { FileHttpResponseOptions } from '@kbn/core-http-server';
import type { File } from '../../common/types';
export declare function getFileHttpResponseOptions(file: File): Pick<FileHttpResponseOptions<Readable>, 'headers' | 'fileContentType'>;
export declare function getDownloadedFileName(file: File): string;
