/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, PropsWithChildren } from 'react';
import type React from 'react';
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
