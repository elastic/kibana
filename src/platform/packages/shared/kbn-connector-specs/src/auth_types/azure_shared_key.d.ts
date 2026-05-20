import { z } from '@kbn/zod/v4';
import type { AuthTypeSpec } from '../connector_spec';
declare const authSchema: z.ZodObject<{
    accountName: z.ZodString;
    accountKey: z.ZodString;
}, z.core.$strip>;
type AuthSchemaType = z.infer<typeof authSchema>;
/**
 * Build CanonicalizedHeaders: all x-ms-* headers lowercased, sorted, format key:value\n.
 * @see https://learn.microsoft.com/en-us/rest/api/storageservices/authorize-with-shared-key
 */
export declare function buildCanonicalizedHeaders(headers: Record<string, string>): string;
/**
 * Build CanonicalizedResource: /accountName + path + \n + sorted query params as key:value.
 * Path is the URL pathname; query params are used as-is and sorted by name.
 */
export declare function buildCanonicalizedResource(accountName: string, pathname: string, searchParams: Record<string, string>): string;
/**
 * Build the string-to-sign for Blob/Queue Shared Key (2009-09-19+).
 * Standard headers in fixed order; use empty string when absent. When x-ms-date is set, Date line is empty.
 * Content-Length 0 is sent as empty string.
 */
export declare function buildStringToSign(verb: string, requestHeaders: Record<string, string>, canonicalizedHeaders: string, canonicalizedResource: string): string;
/**
 * Azure Blob Storage Shared Key authentication.
 * Signs each request with HMAC-SHA256 per the Azure REST API.
 * @see https://learn.microsoft.com/en-us/rest/api/storageservices/authorize-with-shared-key
 */
export declare const AzureSharedKeyAuth: AuthTypeSpec<AuthSchemaType>;
export {};
