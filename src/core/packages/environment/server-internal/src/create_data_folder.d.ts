import type { PathConfigType } from '@kbn/utils';
import type { Logger } from '@kbn/logging';
export declare function createDataFolder({ pathConfig, logger, }: {
    pathConfig: PathConfigType;
    logger: Logger;
}): Promise<void>;
