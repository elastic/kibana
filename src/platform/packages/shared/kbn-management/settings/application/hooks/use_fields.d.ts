import { Query } from '@elastic/eui';
import type { FieldDefinition } from '@kbn/management-settings-types';
import type { UiSettingsScope } from '@kbn/core-ui-settings-common';
/**
 * React hook which retrieves settings and returns an observed collection of
 * {@link FieldDefinition} objects derived from those settings.
 * @param scope The {@link UiSettingsScope} of the settings to be retrieved.
 * @param query The {@link Query} to execute for filtering the fields.
 * @returns An array of {@link FieldDefinition} objects.
 */
export declare const useFields: (scope: UiSettingsScope, query?: Query) => FieldDefinition[];
