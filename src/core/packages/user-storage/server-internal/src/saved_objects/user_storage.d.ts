import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
export declare const USER_STORAGE_SO_TYPE = "user-storage";
export declare const USER_STORAGE_GLOBAL_SO_TYPE = "user-storage-global";
/**
 * Space-scoped per-user storage. One document per user per space.
 * Document ID = profile_uid.
 *
 * Attributes shape: `{ userId: string; data: Record<string, unknown> }`
 * `userId` is indexed for admin queries. `data` is covered by `dynamic: false`.
 */
export declare const userStorageType: SavedObjectsType;
/**
 * Global per-user storage (cross-space). One document per user.
 * Document ID = profile_uid.
 *
 * Same attributes shape as `user-storage`.
 */
export declare const userStorageGlobalType: SavedObjectsType;
