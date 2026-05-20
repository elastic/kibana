import type { Query } from '@elastic/eui';
import type { FieldDefinition } from '@kbn/management-settings-types';
/**
 * React hook which retrieves the fields for each scope (`namespace` and `global`)
 * and returns two collections of {@link FieldDefinition} objects.
 * @param query The {@link Query} to execute for filtering the fields.
 * @returns Two arrays of {@link FieldDefinition} objects.
 */
export declare const useScopeFields: (query?: Query) => [FieldDefinition[], FieldDefinition[]];
