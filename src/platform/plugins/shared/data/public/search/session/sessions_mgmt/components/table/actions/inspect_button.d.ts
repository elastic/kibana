import type { CoreStart } from '@kbn/core/public';
import type { UISession } from '../../../types';
import type { IClickActionDescriptor } from './types';
import type { SearchSessionsMgmtAPI } from '../../../lib/api';
export declare const createInspectActionDescriptor: (api: SearchSessionsMgmtAPI, uiSession: UISession, core: CoreStart, isWithinFlyout?: boolean) => IClickActionDescriptor;
