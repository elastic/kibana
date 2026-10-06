import { z } from '@kbn/zod/v4';
import type { estypes } from '@elastic/elasticsearch';
import type { AccessControl, AccessControlInput } from './types';
export { isEntityAccessControlAdmin, ENTITY_ACCESS_CONTROL_ADMIN_ACTION, } from './is_entity_access_control_admin';
export { logEntityAccessControl } from './audit';
export declare class InvalidAccessControlError extends Error {
}
export declare const ACCESS_CONTROL_MAX_ENTRIES = 100;
export declare const ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH = 1024;
export type { AccessControlMode, AccessControlEntryInput, AccessControlEntry, AccessControl, AccessControlInput, } from './types';
/** Creates a bounded ACL input schema with the consumer's supported roles. */
export declare const createAccessControlSchema: <Role extends string>(roles: readonly [Role, ...Role[]]) => z.ZodObject<{
    access_mode: z.ZodEnum<{
        private: "private";
        public: "public";
    }>;
    entries: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodLiteral<"user">;
        id: z.ZodString;
        role: z.ZodEnum<{ [k in Role]: k; } extends infer T ? { [k in keyof T]: T[k]; } : never>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
/** Validates entries and assigns timestamps while preserving existing membership dates. */
export declare const prepareAccessControl: <Role extends string>({ input, roles, ownerId, previous, now, }: {
    input: AccessControlInput<Role>;
    roles: readonly [Role, ...Role[]];
    ownerId?: string;
    previous?: AccessControl<Role>;
    now?: string;
}) => AccessControl<Role>;
export type EntityAccessDecision = 'allowed' | 'admin_override' | 'denied';
/** Resolves entity access after the consumer has checked its space and feature privileges. */
export declare const resolveEntityAccess: <Role extends string>({ accessControl, ownerId, profileId, roles, allowPublic, isAdmin, }: {
    accessControl: AccessControl<Role>;
    ownerId: string | undefined;
    profileId: string | undefined;
    roles: readonly Role[];
    allowPublic?: boolean;
    isAdmin?: boolean;
}) => EntityAccessDecision;
/** Checks entity access after the consumer has checked its space and feature privileges. */
export declare const hasEntityAccess: <Role extends string>(params: Parameters<typeof resolveEntityAccess<Role>>[0]) => boolean;
/** Builds a read filter for nested ACL entries where every supported role permits reading. */
export declare const buildEntityReadAccessQuery: ({ profileId, ownerField, accessControlField, includeMissing, isAdmin, }: {
    profileId?: string;
    ownerField: string;
    accessControlField: string;
    includeMissing?: boolean;
    isAdmin?: boolean;
}) => estypes.QueryDslQueryContainer;
