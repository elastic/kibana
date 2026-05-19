import type { RouteSecurity } from '@kbn/core-http-server';
import type { DeepPartial } from '@kbn/utility-types';
export declare const validRouteSecurity: (routeSecurity?: DeepPartial<RouteSecurity>) => Readonly<{
    authc?: Readonly<{} & {
        enabled: boolean | "optional" | "minimal";
        reason: string;
    }> | undefined;
} & {
    authz: Readonly<{
        enabled?: false | undefined;
    } & {
        requiredPrivileges: (string | Readonly<{
            anyRequired?: (string | Readonly<{} & {
                allOf: string[];
            }>)[] | undefined;
            allRequired?: (string | Readonly<{} & {
                anyOf: string[];
            }>)[] | undefined;
        } & {}>)[];
        reason: string;
    }>;
}> | undefined;
