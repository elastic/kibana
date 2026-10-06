import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
export interface MountPointPortalProps {
    setMountPoint: SetMountPointFn;
    children: React.ReactNode;
}
type SetMountPointFn = (mountPoint: MountPoint | undefined) => UnsetMountPointFn | void;
type UnsetMountPointFn = () => void;
/**
 * Utility component to portal a part of a react application into the provided `MountPoint`.
 */
export declare const MountPointPortal: FC<PropsWithChildren<MountPointPortalProps>>;
export {};
