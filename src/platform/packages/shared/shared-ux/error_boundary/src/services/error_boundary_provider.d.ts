import type { FC, PropsWithChildren } from 'react';
import type { KibanaErrorBoundaryProviderDeps, KibanaErrorBoundaryServices } from '../../types';
/**
 * A Context Provider for Jest and Storybooks
 * @internal
 */
export declare const KibanaErrorBoundaryDepsProvider: FC<PropsWithChildren<KibanaErrorBoundaryServices>>;
/**
 * Provider that uses dependencies to give context to the KibanaErrorBoundary component
 * This provider is aware if services were already created from a higher level of the component tree
 * @public
 */
export declare const KibanaErrorBoundaryProvider: FC<PropsWithChildren<KibanaErrorBoundaryProviderDeps>>;
/**
 * Utility that provides context
 * @internal
 */
export declare function useErrorBoundary(): KibanaErrorBoundaryServices;
