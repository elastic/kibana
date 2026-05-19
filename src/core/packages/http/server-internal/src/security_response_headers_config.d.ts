import type { TypeOf } from '@kbn/config-schema';
import type { PermissionsPolicyConfigType } from './permissions_policy';
export declare const securityResponseHeadersSchema: import("@kbn/config-schema").ObjectType<{
    strictTransportSecurity: import("@kbn/config-schema").Type<string | null>;
    xContentTypeOptions: import("@kbn/config-schema").Type<"nosniff" | null>;
    referrerPolicy: import("@kbn/config-schema").Type<"origin" | "no-referrer" | "no-referrer-when-downgrade" | "origin-when-cross-origin" | "same-origin" | "strict-origin" | "strict-origin-when-cross-origin" | "unsafe-url" | null>;
    permissionsPolicy: import("@kbn/config-schema").Type<string | null>;
    permissionsPolicyReportOnly: import("@kbn/config-schema").Type<string | null | undefined>;
    disableEmbedding: import("@kbn/config-schema").Type<boolean>;
    crossOriginOpenerPolicy: import("@kbn/config-schema").Type<"same-origin" | "unsafe-none" | "same-origin-allow-popups" | null>;
}>;
/**
 * Parses raw security header config info, returning an object with the appropriate header keys and values.
 *
 * @param raw
 * @internal
 */
export declare function parseRawSecurityResponseHeadersConfig(raw: TypeOf<typeof securityResponseHeadersSchema>, rawPermissionsPolicyConfig: PermissionsPolicyConfigType): {
    securityResponseHeaders: Record<string, string | string[]>;
    disableEmbedding: boolean;
};
