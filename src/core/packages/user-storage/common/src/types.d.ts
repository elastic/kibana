import type { ZodType } from '@kbn/zod/v4';
/** Whether a key is scoped to a single space or is global across all spaces. */
export type UserStorageScope = 'space' | 'global';
/** Definition for a single user storage key, provided at registration time. */
export interface UserStorageDefinition<T = unknown> {
    /** zod/v4 schema used to validate values on write. */
    schema: ZodType<T>;
    /** Value returned when the user has not set this key. */
    defaultValue: T;
    /** Whether this key is per-space or global. */
    scope: UserStorageScope;
}
/** A record of key → definition, passed to `register()`. */
export type UserStorageRegistrations = Record<string, UserStorageDefinition>;
/** Server-side scoped client returned by `asScopedToClient()`. */
export interface IUserStorageClient {
    /** Resolve a single key: returns the user override or the registered default. */
    get<T = unknown>(key: string): Promise<T>;
    /** Resolve all registered keys (user overrides merged with defaults). */
    getAll(): Promise<Record<string, unknown>>;
    /** Validate and persist a value for the current user. */
    set<T = unknown>(key: string, value: T): Promise<void>;
    /** Remove the user override so the key falls back to its default. */
    remove(key: string): Promise<void>;
}
