import type { FieldRowServices, FieldRowKibanaDependencies } from '@kbn/management-settings-components-field-row';
/**
 * Contextual services used by a {@link FieldCategory} component and its dependents.
 */
export type FieldCategoryServices = FieldRowServices;
/**
 * An interface containing a collection of Kibana plugins and services required to
 * render a {@link FieldCategory} component and its dependents.
 */
export type FieldCategoryKibanaDependencies = FieldRowKibanaDependencies;
