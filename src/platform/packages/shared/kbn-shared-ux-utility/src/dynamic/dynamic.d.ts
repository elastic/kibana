import React from 'react';
type Loader<TElement extends React.ComponentType<any>> = () => Promise<{
    default: TElement;
}>;
/**
 * Options for the lazy loaded component
 */
export interface DynamicOptions {
    fallback?: React.SuspenseProps['fallback'];
}
/**
 * Lazy load and wrap with Suspense any component.
 *
 * @example
 * // Lazy load a component
 * const Header = dynamic(() => import('./components/header'))
 * // Lazy load a component and use a fallback component while loading
 * const Header = dynamic(() => import('./components/header'), {fallback: <EuiLoadingSpinner />})
 * // Lazy load a named exported component
 * const MobileHeader = dynamic<MobileHeaderProps>(() => import('./components/header').then(mod => ({default: mod.MobileHeader})))
 */
export declare function dynamic<TElement extends React.ComponentType<any>, TRef = {}>(loader: Loader<TElement>, options?: DynamicOptions): React.ForwardRefExoticComponent<React.PropsWithoutRef<React.ComponentPropsWithRef<TElement>> & React.RefAttributes<TRef>>;
export {};
