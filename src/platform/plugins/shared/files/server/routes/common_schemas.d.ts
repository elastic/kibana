import type { Type } from '@kbn/config-schema';
export declare const fileName: Type<string>;
export declare const fileNameWithExt: Type<string>;
export declare const fileAlt: Type<string | undefined>;
/** Saved-object style file / share IDs (request params & body). */
export declare const fileId: Type<string>;
/** MIME type strings (e.g. application/pdf). */
export declare const fileMimeType: Type<string>;
/**
 * Public file-share tokens. Generated tokens are 40 chars; 1024 is a generous
 * DoS ceiling for the request query param.
 */
export declare const fileShareToken: Type<string>;
export declare const page: Type<number>;
export declare const pageSize: Type<number>;
export declare const fileMeta: Type<unknown>;
