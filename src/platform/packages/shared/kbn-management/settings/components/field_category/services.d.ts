import type React from 'react';
import type { FieldCategoryServices } from './types';
/**
 * Props for {@link FieldCategoryProvider}.
 */
export interface FieldCategoryProviderProps extends FieldCategoryServices {
    children: React.ReactNode;
}
/**
 * React Provider that provides services to a {@link FieldCategory} component and its dependents.
 */
export declare const FieldCategoryProvider: ({ children, ...services }: import("@kbn/management-settings-components-field-row").FieldRowProviderProps) => React.JSX.Element;
/**
 * Kibana-specific Provider that maps Kibana plugins and services to a {@link FieldCategoryProvider}.
 */
export declare const FieldCategoryKibanaProvider: React.FC<React.PropsWithChildren<import("@kbn/management-settings-components-field-row").FieldRowKibanaDependencies>>;
