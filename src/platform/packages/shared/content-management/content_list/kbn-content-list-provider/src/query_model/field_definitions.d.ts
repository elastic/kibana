import type { FieldDefinition, FlagDefinition } from './types';
/**
 * Hook that builds {@link FieldDefinition} and {@link FlagDefinition} arrays
 * from the services and support flags registered on the provider.
 *
 * Adding a new user-field filter only requires calling `makeUserFieldDefinition`
 * with the field name and the shared profile cache.
 */
export declare const useFieldDefinitions: () => {
    fields: FieldDefinition[];
    flags: FlagDefinition[];
    /**
     * Stable list of registered field names (e.g. `['tag', 'createdBy']`).
     *
     * Unlike `fields` (which updates when resolver functions change — e.g. the
     * profile cache loads data), `fieldNames` only changes when the *set* of
     * registered fields changes (feature flags toggled, services added/removed).
     * This keeps the search bar schema stable across async profile loading.
     */
    fieldNames: string[];
};
