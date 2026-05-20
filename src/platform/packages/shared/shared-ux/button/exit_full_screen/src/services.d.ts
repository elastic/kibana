import type { FC, PropsWithChildren } from 'react';
import type { Services, ExitFullScreenButtonServices, ExitFullScreenButtonKibanaDependencies } from '../types';
/**
 * Abstract external service Provider.
 */
export declare const ExitFullScreenButtonProvider: FC<PropsWithChildren<ExitFullScreenButtonServices>>;
/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export declare const ExitFullScreenButtonKibanaProvider: FC<PropsWithChildren<ExitFullScreenButtonKibanaDependencies>>;
/**
 * React hook for accessing pre-wired services.
 */
export declare function useServices(): Services;
