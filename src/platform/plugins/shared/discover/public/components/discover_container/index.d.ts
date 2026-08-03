import type { DiscoverContainerInternalProps } from './discover_container';
export type DiscoverContainerProps = Omit<DiscoverContainerInternalProps, 'getDiscoverServices'>;
export declare const DiscoverContainerInternal: import("react").ForwardRefExoticComponent<DiscoverContainerInternalProps & import("@kbn/shared-ux-utility").WithSuspenseExtendedDeps & import("react").RefAttributes<{}>>;
