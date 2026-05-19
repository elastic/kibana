import type { CoreStart } from '@kbn/core/public';
import type { IClickActionDescriptor } from './types';
import type { SearchSessionsMgmtAPI } from '../../../lib/api';
import type { UISession } from '../../../types';
import { ACTION } from '../../../types';
export declare const getAction: (api: SearchSessionsMgmtAPI, actionType: ACTION, uiSession: UISession, core: CoreStart, isWithinFlyout?: boolean) => IClickActionDescriptor | null;
