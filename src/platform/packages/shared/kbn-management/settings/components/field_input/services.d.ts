import type { FC, PropsWithChildren } from 'react';
import type { FieldInputServices, FieldInputKibanaDependencies } from './types';
/**
 * React Provider that provides services to a {@link FieldInput} component and its dependents.
 */
export declare const FieldInputProvider: FC<PropsWithChildren<FieldInputServices>>;
/**
 * Kibana-specific Provider that maps Kibana plugins and services to a {@link FieldInputProvider}.
 */
export declare const FieldInputKibanaProvider: FC<PropsWithChildren<FieldInputKibanaDependencies>>;
/**
 * React hook for accessing pre-wired services.
 *
 * @see {@link FieldInputServices}
 */
export declare const useServices: () => FieldInputServices;
