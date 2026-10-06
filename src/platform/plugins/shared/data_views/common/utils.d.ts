import type { PersistenceAPI } from './types';
/**
 * Returns an object matching a given name
 *
 * @param client {SavedObjectsClientCommon}
 * @param name {string}
 * @returns {SavedObject|undefined}
 */
export declare function findByName(client: PersistenceAPI, name: string): Promise<import("@kbn/core/server").SavedObject<import("@kbn/data-views-types").DataViewAttributes> | undefined>;
export declare function unwrapEtag(ifNoneMatch: string): string;
