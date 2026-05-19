import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { FormServices, FormKibanaDependencies, Services } from './types';
/**
 * Props for {@link FormProvider}.
 */
export interface FormProviderProps extends FormServices {
    children: React.ReactNode;
}
/**
 * React Provider that provides services to a {@link Form} component and its dependents.
 */
export declare const FormProvider: ({ children, ...services }: FormProviderProps) => React.JSX.Element;
/**
 * Kibana-specific Provider that maps Kibana plugins and services to a {@link FormProvider}.
 */
export declare const FormKibanaProvider: FC<PropsWithChildren<FormKibanaDependencies>>;
/**
 * React hook for accessing pre-wired services.
 */
export declare const useServices: () => Services;
