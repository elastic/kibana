import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { RenderingService } from '@kbn/core-rendering-browser';
import type { KibanaRenderContextProviderProps } from '@kbn/react-kibana-context-render';
import React from 'react';
/**
 * @deprecated Pass RenderingService as the second parameter to toMountPoint instead
 */
type ToMountPointParamsDeprecated = Pick<KibanaRenderContextProviderProps, 'analytics' | 'i18n' | 'theme' | 'userProfile'>;
export type ToMountPointParams = ToMountPointParamsDeprecated | RenderingService;
/**
 * MountPoint converter for react nodes.
 *
 * @param node React node to get a mount point for
 * @param params services needed for rendering fully-featured React nodes in Kibana
 */
export declare const toMountPoint: (node: React.ReactNode, params: ToMountPointParams) => MountPoint;
export {};
