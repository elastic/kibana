import type { SearchSessionsConfigSchema } from '../../../../../server/config';
export declare const getExpirationStatus: (config: SearchSessionsConfigSchema, expires: string | null) => {
    toolTipContent: string;
    statusContent: string;
} | undefined;
