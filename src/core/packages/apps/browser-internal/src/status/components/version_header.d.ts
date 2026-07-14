import type { FC } from 'react';
import type { ServerVersion } from '@kbn/core-status-common';
interface VersionHeaderProps {
    version: ServerVersion;
}
export declare const VersionHeader: FC<VersionHeaderProps>;
export {};
