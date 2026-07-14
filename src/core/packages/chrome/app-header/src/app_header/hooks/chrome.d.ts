import type { IBasePath } from '@kbn/core-http-browser';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
export declare function useBasePath(): IBasePath;
export declare function useLegacyActionMenu(): MountPoint | undefined;
export declare function useHasLegacyActionMenu(): boolean;
