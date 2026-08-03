import React from 'react';
import type { TabItem } from '../../types';
export interface EditTabLabelProps {
    item: TabItem;
    onLabelEdited: (item: TabItem, newLabel: string) => Promise<void>;
    onExit: () => void;
}
export declare const EditTabLabel: React.FC<EditTabLabelProps>;
