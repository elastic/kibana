import React from 'react';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
export interface MountWrapperComponentProps {
    mount: MountPoint;
    className?: string;
}
/**
 * MountWrapper is a react component to mount a {@link MountPoint} inside a react tree.
 * @internal
 */
type MountWrapperComponent = React.FunctionComponent<MountWrapperComponentProps>;
/**
 * MountWrapper is a react component to mount a {@link MountPoint} inside a react tree.
 * @internal
 */
export declare const MountWrapper: MountWrapperComponent;
/**
 * Mount converter for react node.
 * This should only be used in internal Core packages to prevent circular dependency issues
 *
 * @param node to get a mount for
 * @internal
 */
export declare const mountReactNode: (node: React.ReactNode) => MountPoint;
export {};
