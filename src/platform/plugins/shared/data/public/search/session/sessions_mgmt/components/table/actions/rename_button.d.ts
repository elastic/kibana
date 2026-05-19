import type { CoreStart } from '@kbn/core/public';
import type { SearchSessionsMgmtAPI } from '../../../lib/api';
import type { IClickActionDescriptor } from './types';
import type { UISession } from '../../../types';
export declare const createRenameActionDescriptor: (api: SearchSessionsMgmtAPI, uiSession: UISession, core: CoreStart) => IClickActionDescriptor;
