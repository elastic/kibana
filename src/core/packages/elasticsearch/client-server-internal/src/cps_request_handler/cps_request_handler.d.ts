import type { Logger } from '@kbn/logging';
import type { OnRequestHandler } from '../create_transport';
/** @internal */
export declare function getCpsRequestHandler(cpsEnabled: boolean, projectRouting: string, logger: Logger): OnRequestHandler;
