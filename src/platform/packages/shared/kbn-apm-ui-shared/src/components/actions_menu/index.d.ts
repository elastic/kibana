import React from 'react';
import type { ActionGroups } from './types';
export type { ActionBase, ActionSubItem, Action, ActionGroup, ActionGroups } from './types';
interface ActionsMenuProps {
    actions: ActionGroups;
    id?: string;
    dataTestSubjPrefix?: string;
}
export declare function ActionsMenu({ actions, id, dataTestSubjPrefix }: ActionsMenuProps): React.JSX.Element;
