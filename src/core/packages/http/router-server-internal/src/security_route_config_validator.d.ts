import type { RouteSecurity } from '@kbn/core-http-server';
import type { DeepPartial } from '@kbn/utility-types';
export declare const validRouteSecurity: (routeSecurity?: DeepPartial<RouteSecurity>) => Readonly<{
    authc?: Readonly<{} & {
        reason: string;
        enabled: boolean | "optional" | "minimal";
    }> | undefined;
} & {
    authz: Readonly<{
        enabled?: false | undefined;
    } & {
        reason: string;
        requiredPrivileges: (string | Readonly<{
            anyRequired?: (string | Readonly<{} & {
                allOf: string[];
            }>)[] | undefined;
            allRequired?: (string | Readonly<{} & {
                anyOf: string[];
            }>)[] | undefined;
        } & {}>)[];
    }>;
}> | undefined;
