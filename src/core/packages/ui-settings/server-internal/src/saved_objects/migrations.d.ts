import type { SavedObjectUnsanitizedDoc, SavedObjectSanitizedDoc, SavedObjectsModelVersionMap, SavedObjectModelUnsafeTransformFn } from '@kbn/core-saved-objects-server';
/**
 * @note Since all `uiSettings` migrations are added to the same migration function,
 * while not required, grouping settings by team, using a consistent naming prefix,
 * is good practice. For example: `ml:<setting-name>`.
 */
interface QuickRange {
    from: string;
    to: string;
    display: string;
}
/**
 * Presets appended to `timepicker:quickRanges` in model version 3.
 * Ordered chronologically (shortest span first within each family) so that the
 * block appended to a user's existing list reads naturally.
 *
 * Entries are deduped by `from|to`, so existing customizations (including custom
 * `display` labels) are preserved.
 *
 * Display strings are intentionally plain English: stored UI-setting values are
 * literal strings, never re-translated at read-time. The defaults registered in
 * the `data` plugin use `i18n.translate(...)`, which is resolved at server-startup
 * for the new value path only.
 */
export declare const TIMEPICKER_QUICK_RANGES_V3_PRESETS: ReadonlyArray<QuickRange>;
export declare const mergeTimepickerQuickRangesV3: SavedObjectModelUnsafeTransformFn<any, any>;
export declare const modelVersions: SavedObjectsModelVersionMap;
/**
 * Migrations using legacy upgrade mechanism, do not add to or remove from this map.
 * Future migrations should live in modelVersions map.
 */
export declare const migrations: {
    '7.9.0': (doc: SavedObjectUnsanitizedDoc<any>) => SavedObjectSanitizedDoc<any>;
    '7.12.0': (doc: SavedObjectUnsanitizedDoc<any>) => SavedObjectSanitizedDoc<any>;
    '7.13.0': (doc: SavedObjectUnsanitizedDoc<any>) => SavedObjectSanitizedDoc<any>;
    '8.0.0': (doc: SavedObjectUnsanitizedDoc<any>) => SavedObjectSanitizedDoc<any>;
    '8.1.0': (doc: SavedObjectUnsanitizedDoc<any>) => SavedObjectSanitizedDoc<any>;
    '8.5.0': (doc: SavedObjectUnsanitizedDoc<any>) => SavedObjectSanitizedDoc<any>;
    '8.7.0': (doc: SavedObjectUnsanitizedDoc<any>) => SavedObjectSanitizedDoc<any>;
    '8.9.0': (doc: SavedObjectUnsanitizedDoc<any>) => SavedObjectSanitizedDoc<any>;
};
export {};
