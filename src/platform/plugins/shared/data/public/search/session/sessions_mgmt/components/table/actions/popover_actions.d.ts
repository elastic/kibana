import type { CoreStart } from '@kbn/core/public';
import React from 'react';
import type { SearchSessionsMgmtAPI } from '../../../lib/api';
import type { UISession } from '../../../types';
import type { OnActionComplete } from './types';
interface PopoverActionItemsProps {
    session: UISession;
    api: SearchSessionsMgmtAPI;
    onActionComplete: OnActionComplete;
    core: CoreStart;
    allowedActions?: UISession['actions'];
}
export declare const PopoverActionsMenu: ({ api, onActionComplete, session, core, allowedActions, }: PopoverActionItemsProps) => React.JSX.Element | null;
export {};
