import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { FieldRowServices, FieldRowKibanaDependencies, Services } from './types';
/**
 * Props for {@link FieldRowProvider}.
 */
export interface FieldRowProviderProps extends FieldRowServices {
    children: React.ReactNode;
}
/**
 * React Provider that provides services to a {@link FieldRow} component and its dependents.\
 */
export declare const FieldRowProvider: ({ children, ...services }: FieldRowProviderProps) => React.JSX.Element;
/**
 * Kibana-specific Provider that maps Kibana plugins and services to a {@link FieldRowProvider}.
 */
export declare const FieldRowKibanaProvider: FC<PropsWithChildren<FieldRowKibanaDependencies>>;
/**
 * React hook for accessing pre-wired services.
 */
export declare const useServices: () => Services;
