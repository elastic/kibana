import React from 'react';
import type { LogDocumentOverview } from '@kbn/discover-utils';
interface LogLevelProps {
    level: LogDocumentOverview['log.level'];
}
export declare function LogLevel({ level }: LogLevelProps): React.JSX.Element | null;
export {};
