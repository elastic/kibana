import type { CoreSetup } from '@kbn/core/public';
import { ExpressionsService as CommonExpressionsService } from '../../common';
export declare class ExpressionsService extends CommonExpressionsService {
    setup({ getStartServices }: Pick<CoreSetup, 'getStartServices'>): import("../../common").ExpressionsServiceSetup;
}
