import type { Logger } from '@kbn/logging';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { type ActiveMigrations } from './types';
/**
 * Converts migrations from a format that is convenient for callers to a format that
 * is convenient for our internal usage:
 * From: { type: { version: fn } }
 * To:   { type: { latestVersion?: Record<TransformType, string>; transforms: [{ version: string, transform: fn }] } }
 */
export declare function buildActiveMigrations({ typeRegistry, kibanaVersion, convertVersion, log, }: {
    typeRegistry: ISavedObjectTypeRegistry;
    kibanaVersion: string;
    convertVersion?: string;
    log: Logger;
}): ActiveMigrations;
