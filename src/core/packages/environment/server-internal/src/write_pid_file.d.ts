import type { Logger } from '@kbn/logging';
import type { PidConfigType } from './pid_config';
export declare const writePidFile: ({ pidConfig, logger, }: {
    pidConfig: PidConfigType;
    logger: Logger;
}) => Promise<void>;
